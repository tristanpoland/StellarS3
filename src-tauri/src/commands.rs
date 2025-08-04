use tauri::command;

use crate::s3::S3Manager;
use crate::types::*;

#[command]
pub async fn connect_to_s3(config: S3Config) -> Result<bool, String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.test_connection().await.map_err(|e| e.to_string())
}

#[command]
pub async fn test_connection(config: S3Config) -> Result<bool, String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.test_connection().await.map_err(|e| e.to_string())
}

#[command]
pub async fn list_buckets(config: S3Config) -> Result<Vec<S3Bucket>, String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.list_buckets().await.map_err(|e| e.to_string())
}

#[command]
pub async fn list_objects(config: S3Config, bucket: String, prefix: Option<String>) -> Result<Vec<S3Object>, String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    let prefix_ref = prefix.as_deref();
    manager.list_objects(&bucket, prefix_ref).await.map_err(|e| e.to_string())
}

#[command]
pub async fn upload_file(config: S3Config, bucket: String, key: String, file_path: String) -> Result<(), String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.upload_file(&bucket, &key, &file_path).await.map_err(|e| e.to_string())
}

#[command]
pub async fn upload_data(config: S3Config, bucket: String, key: String, data: Vec<u8>) -> Result<(), String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.upload_data(&bucket, &key, data).await.map_err(|e| e.to_string())
}

#[command]
pub async fn download_file(config: S3Config, bucket: String, key: String, file_path: String) -> Result<(), String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.download_file(&bucket, &key, &file_path).await.map_err(|e| e.to_string())
}

#[command]
pub async fn delete_object(config: S3Config, bucket: String, key: String) -> Result<(), String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.delete_object(&bucket, &key).await.map_err(|e| e.to_string())
}

#[command]
pub async fn create_bucket(config: S3Config, bucket: String) -> Result<(), String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.create_bucket(&bucket).await.map_err(|e| e.to_string())
}

#[command]
pub async fn delete_bucket(config: S3Config, bucket: String) -> Result<(), String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.delete_bucket(&bucket).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_object_metadata(config: S3Config, bucket: String, key: String) -> Result<ObjectMetadata, String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.get_object_metadata(&bucket, &key).await.map_err(|e| e.to_string())
}

#[command]
pub async fn copy_object(config: S3Config, request: CopyObjectRequest) -> Result<(), String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.copy_object(&request).await.map_err(|e| e.to_string())
}

#[command]
pub async fn move_object(config: S3Config, request: MoveObjectRequest) -> Result<(), String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.move_object(&request).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_presigned_url(config: S3Config, request: PresignedUrlRequest) -> Result<String, String> {
    let manager = S3Manager::new(config).await.map_err(|e| e.to_string())?;
    manager.get_presigned_url(&request).await.map_err(|e| e.to_string())
}