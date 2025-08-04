use anyhow::{anyhow, Result};
use aws_config::{BehaviorVersion, Region};
use aws_sdk_s3::{
    config::{Credentials, SharedCredentialsProvider},
    primitives::ByteStream,
    types::{BucketLocationConstraint, CreateBucketConfiguration},
    Client,
};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::OnceLock;
use tokio::sync::Mutex;

use crate::types::*;

static S3_CLIENT: OnceLock<Mutex<Option<Client>>> = OnceLock::new();

pub struct S3Manager {
    client: Client,
    config: S3Config,
}

impl S3Manager {
    pub async fn new(config: S3Config) -> Result<Self> {
        let credentials = Credentials::new(
            &config.access_key,
            &config.secret_key,
            None,
            None,
            "stellars3",
        );

        let mut aws_config_builder = aws_config::defaults(BehaviorVersion::latest())
            .region(Region::new(config.region.clone()))
            .credentials_provider(SharedCredentialsProvider::new(credentials));

        if !config.endpoint.is_empty() && config.endpoint != "s3.amazonaws.com" {
            let endpoint_url = if config.use_ssl {
                format!("https://{}", config.endpoint)
            } else {
                format!("http://{}", config.endpoint)
            };
            aws_config_builder = aws_config_builder.endpoint_url(endpoint_url);
        }

        let aws_config = aws_config_builder.load().await;

        let mut s3_config_builder = aws_sdk_s3::config::Builder::from(&aws_config);
        
        if config.path_style {
            s3_config_builder = s3_config_builder.force_path_style(true);
        }

        let client = Client::from_conf(s3_config_builder.build());

        Ok(Self { client, config })
    }

    pub async fn test_connection(&self) -> Result<bool> {
        match self.client.list_buckets().send().await {
            Ok(_) => Ok(true),
            Err(e) => Err(anyhow!("Connection failed: {}", e)),
        }
    }

    pub async fn list_buckets(&self) -> Result<Vec<S3Bucket>> {
        let response = self.client.list_buckets().send().await?;
        
        let buckets = response
            .buckets()
            .iter()
            .map(|bucket| S3Bucket {
                name: bucket.name().unwrap_or("").to_string(),
                creation_date: bucket.creation_date().map(|dt| {
                    DateTime::from_timestamp(dt.secs(), dt.subsec_nanos()).unwrap_or_default()
                }),
            })
            .collect();

        Ok(buckets)
    }

    pub async fn list_objects(&self, bucket: &str, prefix: Option<&str>) -> Result<Vec<S3Object>> {
        let mut request = self.client.list_objects_v2().bucket(bucket);
        
        if let Some(prefix) = prefix {
            request = request.prefix(prefix);
        }

        let response = request.send().await?;
        
        let mut objects = Vec::new();

        // Add directories from common prefixes
        let common_prefixes = response.common_prefixes();
        if !common_prefixes.is_empty() {
            for prefix in common_prefixes {
                if let Some(prefix_str) = prefix.prefix() {
                    objects.push(S3Object {
                        key: prefix_str.to_string(),
                        size: 0,
                        last_modified: None,
                        etag: None,
                        storage_class: None,
                        is_dir: true,
                        content_type: Some("application/x-directory".to_string()),
                    });
                }
            }
        }

        // Add files
        let contents = response.contents();
        if !contents.is_empty() {
            for object in contents {
                let key = object.key().unwrap_or("").to_string();
                
                // Skip if it's just a directory marker
                if key.ends_with('/') && object.size() == Some(0) {
                    continue;
                }

                objects.push(S3Object {
                    key: key.clone(),
                    size: object.size().unwrap_or(0),
                    last_modified: object.last_modified().map(|dt| {
                        DateTime::from_timestamp(dt.secs(), dt.subsec_nanos()).unwrap_or_default()
                    }),
                    etag: object.e_tag().map(|s| s.to_string()),
                    storage_class: object.storage_class().map(|s| s.as_str().to_string()),
                    is_dir: false,
                    content_type: mime_guess::from_path(&key).first().map(|m| m.to_string()),
                });
            }
        }

        Ok(objects)
    }

    pub async fn upload_file(&self, bucket: &str, key: &str, file_path: &str) -> Result<()> {
        let body = ByteStream::from_path(file_path).await?;
        
        self.client
            .put_object()
            .bucket(bucket)
            .key(key)
            .body(body)
            .send()
            .await?;

        Ok(())
    }

    pub async fn upload_data(&self, bucket: &str, key: &str, data: Vec<u8>) -> Result<()> {
        let body = ByteStream::from(data);
        
        self.client
            .put_object()
            .bucket(bucket)
            .key(key)
            .body(body)
            .send()
            .await?;

        Ok(())
    }

    pub async fn download_file(&self, bucket: &str, key: &str, file_path: &str) -> Result<()> {
        let response = self.client
            .get_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await?;

        let data = response.body.collect().await?;
        tokio::fs::write(file_path, data.into_bytes()).await?;

        Ok(())
    }

    pub async fn download_data(&self, bucket: &str, key: &str) -> Result<Vec<u8>> {
        let response = self.client
            .get_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await?;

        let data = response.body.collect().await?;
        Ok(data.into_bytes().to_vec())
    }

    pub async fn delete_object(&self, bucket: &str, key: &str) -> Result<()> {
        self.client
            .delete_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await?;

        Ok(())
    }

    pub async fn create_bucket(&self, bucket: &str) -> Result<()> {
        let mut request = self.client.create_bucket().bucket(bucket);

        // For regions other than us-east-1, we need to specify the location constraint
        if self.config.region != "us-east-1" {
            let constraint = BucketLocationConstraint::from(self.config.region.as_str());
            let config = CreateBucketConfiguration::builder()
                .location_constraint(constraint)
                .build();
            request = request.create_bucket_configuration(config);
        }

        request.send().await?;
        Ok(())
    }

    pub async fn delete_bucket(&self, bucket: &str) -> Result<()> {
        self.client
            .delete_bucket()
            .bucket(bucket)
            .send()
            .await?;

        Ok(())
    }

    pub async fn get_object_metadata(&self, bucket: &str, key: &str) -> Result<ObjectMetadata> {
        let response = self.client
            .head_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await?;

        let mut metadata = HashMap::new();
        if let Some(meta) = response.metadata() {
            for (k, v) in meta {
                metadata.insert(k.clone(), v.clone());
            }
        }

        Ok(ObjectMetadata {
            key: key.to_string(),
            size: response.content_length().unwrap_or(0),
            last_modified: response.last_modified().map(|dt| {
                DateTime::from_timestamp(dt.secs(), dt.subsec_nanos()).unwrap_or_default()
            }),
            etag: response.e_tag().map(|s| s.to_string()),
            content_type: response.content_type().map(|s| s.to_string()),
            metadata,
        })
    }

    pub async fn copy_object(&self, request: &CopyObjectRequest) -> Result<()> {
        let copy_source = format!("{}/{}", request.source_bucket, request.source_key);
        
        self.client
            .copy_object()
            .bucket(&request.dest_bucket)
            .key(&request.dest_key)
            .copy_source(&copy_source)
            .send()
            .await?;

        Ok(())
    }

    pub async fn move_object(&self, request: &MoveObjectRequest) -> Result<()> {
        // First copy the object
        let copy_request = CopyObjectRequest {
            source_bucket: request.source_bucket.clone(),
            source_key: request.source_key.clone(),
            dest_bucket: request.dest_bucket.clone(),
            dest_key: request.dest_key.clone(),
        };
        
        self.copy_object(&copy_request).await?;
        
        // Then delete the original
        self.delete_object(&request.source_bucket, &request.source_key).await?;

        Ok(())
    }

    pub async fn get_presigned_url(&self, request: &PresignedUrlRequest) -> Result<String> {
        let expires_in = std::time::Duration::from_secs(request.expires_in);
        
        let presigned_request = match request.method.to_uppercase().as_str() {
            "GET" => {
                self.client
                    .get_object()
                    .bucket(&request.bucket)
                    .key(&request.key)
                    .presigned(aws_sdk_s3::presigning::PresigningConfig::expires_in(expires_in)?)
                    .await?
            }
            "PUT" => {
                self.client
                    .put_object()
                    .bucket(&request.bucket)
                    .key(&request.key)
                    .presigned(aws_sdk_s3::presigning::PresigningConfig::expires_in(expires_in)?)
                    .await?
            }
            "DELETE" => {
                self.client
                    .delete_object()
                    .bucket(&request.bucket)
                    .key(&request.key)
                    .presigned(aws_sdk_s3::presigning::PresigningConfig::expires_in(expires_in)?)
                    .await?
            }
            _ => return Err(anyhow!("Unsupported HTTP method: {}", request.method)),
        };

        Ok(presigned_request.uri().to_string())
    }
}

pub async fn get_or_create_client(config: S3Config) -> Result<()> {
    let client_mutex = S3_CLIENT.get_or_init(|| Mutex::new(None));
    let mut client_guard = client_mutex.lock().await;
    
    let manager = S3Manager::new(config).await?;
    *client_guard = Some(manager.client);
    
    Ok(())
}

pub async fn with_client<F, R>(f: F) -> Result<R>
where
    F: FnOnce(&Client) -> R,
{
    let client_mutex = S3_CLIENT.get().ok_or_else(|| anyhow!("S3 client not initialized"))?;
    let client_guard = client_mutex.lock().await;
    let client = client_guard.as_ref().ok_or_else(|| anyhow!("S3 client not initialized"))?;
    Ok(f(client))
}