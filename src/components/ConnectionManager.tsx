import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { 
  Plus, 
  Settings, 
  Globe, 
  Server, 
  Cloud, 
  HardDrive,
  Trash2,
  Edit3,
  Check,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { ConnectionProfile, S3Config } from '../types';

interface ConnectionManagerProps {
  connections: ConnectionProfile[];
  onConnectionsChange: (connections: ConnectionProfile[]) => void;
  onConnectionSelect: (connection: ConnectionProfile) => void;
  onClose: () => void;
}

const PROVIDER_PRESETS = {
  aws: {
    name: 'Amazon S3',
    icon: Cloud,
    endpoint: 's3.amazonaws.com',
    region: 'us-east-1',
    use_ssl: true,
    path_style: false,
  },
  minio: {
    name: 'MinIO',
    icon: Server,
    endpoint: 'localhost:9000',
    region: 'us-east-1',  
    use_ssl: false,
    path_style: true,
  },
  digitalocean: {
    name: 'DigitalOcean Spaces',
    icon: Globe,
    endpoint: 'nyc3.digitaloceanspaces.com',
    region: 'us-east-1',
    use_ssl: true,
    path_style: false,
  },
  wasabi: {
    name: 'Wasabi',
    icon: HardDrive,
    endpoint: 's3.wasabisys.com',
    region: 'us-east-1',
    use_ssl: true,
    path_style: false,
  },
  backblaze: {
    name: 'Backblaze B2',
    icon: HardDrive,
    endpoint: 's3.us-west-002.backblazeb2.com',
    region: 'us-west-002',
    use_ssl: true,
    path_style: false,
  },
  other: {
    name: 'Custom S3 Compatible',
    icon: Settings,
    endpoint: '',
    region: 'us-east-1',
    use_ssl: true,
    path_style: true,
  }
};

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  connections,
  onConnectionsChange,
  onConnectionSelect,
  onClose
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<keyof typeof PROVIDER_PRESETS>('aws');
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    config: S3Config;
  }>({
    name: '',
    config: {
      endpoint: PROVIDER_PRESETS.aws.endpoint,
      access_key: '',
      secret_key: '',
      region: PROVIDER_PRESETS.aws.region,
      use_ssl: PROVIDER_PRESETS.aws.use_ssl,
      path_style: PROVIDER_PRESETS.aws.path_style,
    }
  });

  const handleProviderSelect = (provider: keyof typeof PROVIDER_PRESETS) => {
    setSelectedProvider(provider);
    const preset = PROVIDER_PRESETS[provider];
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        endpoint: preset.endpoint,
        region: preset.region,
        use_ssl: preset.use_ssl,
        path_style: preset.path_style,
      }
    }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await invoke('test_connection', { config: formData.config });
      alert('Connection successful!');
    } catch (error) {
      alert(`Connection failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isFirstConnection = connections.length === 0;
    
    const newConnection: ConnectionProfile = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      config: formData.config,
      is_active: isFirstConnection,
      created_at: new Date().toISOString(),
      provider_type: selectedProvider,
    };

    let updatedConnections;
    if (editingId) {
      updatedConnections = connections.map(conn => 
        conn.id === editingId ? newConnection : conn
      );
    } else {
      updatedConnections = [...connections, newConnection];
    }

    onConnectionsChange(updatedConnections);
    
    // Always select the connection we just created/updated
    onConnectionSelect(newConnection);
    
    resetForm();
  };

  const handleEdit = (connection: ConnectionProfile) => {
    setEditingId(connection.id);
    setSelectedProvider(connection.provider_type);
    setFormData({
      name: connection.name,
      config: connection.config,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this connection?')) {
      const updatedConnections = connections.filter(conn => conn.id !== id);
      onConnectionsChange(updatedConnections);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setSelectedProvider('aws');
    setShowPassword(false);
    setFormData({
      name: '',
      config: {
        endpoint: PROVIDER_PRESETS.aws.endpoint,
        access_key: '',
        secret_key: '',
        region: PROVIDER_PRESETS.aws.region,
        use_ssl: PROVIDER_PRESETS.aws.use_ssl,
        path_style: PROVIDER_PRESETS.aws.path_style,
      }
    });
  };

  if (showForm) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl mx-auto p-6"
      >
        <div className="card p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-amoled-text">
              {editingId ? 'Edit Connection' : 'New S3 Connection'}
            </h2>
            <button
              onClick={resetForm}
              className="text-amoled-text-muted hover:text-amoled-text"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-amoled-text mb-3">
                Provider Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleProviderSelect(key as keyof typeof PROVIDER_PRESETS)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${
                        selectedProvider === key
                          ? 'border-amoled-accent bg-amoled-accent/10'
                          : 'border-amoled-border hover:border-amoled-accent/50'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-medium">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-amoled-text mb-2">
                Connection Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-field w-full"
                placeholder="My S3 Connection"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-amoled-text mb-2">
                  Endpoint
                </label>
                <input
                  type="text"
                  value={formData.config.endpoint}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, endpoint: e.target.value }
                  }))}
                  className="input-field w-full"
                  placeholder="s3.amazonaws.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amoled-text mb-2">
                  Region
                </label>
                <input
                  type="text"
                  value={formData.config.region}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, region: e.target.value }
                  }))}
                  className="input-field w-full"
                  placeholder="us-east-1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-amoled-text mb-2">
                Access Key
              </label>
              <input
                type="text"
                value={formData.config.access_key}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, access_key: e.target.value }
                }))}
                className="input-field w-full"
                placeholder="Your access key"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amoled-text mb-2">
                Secret Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.config.secret_key}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, secret_key: e.target.value }
                  }))}
                  className="input-field w-full pr-10"
                  placeholder="Your secret key"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amoled-text-muted hover:text-amoled-text"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.config.use_ssl}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, use_ssl: e.target.checked }
                  }))}
                  className="rounded border-amoled-border bg-amoled-gray focus:ring-amoled-accent"
                />
                <span className="text-sm text-amoled-text">Use SSL/TLS</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.config.path_style}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, path_style: e.target.checked }
                  }))}
                  className="rounded border-amoled-border bg-amoled-gray focus:ring-amoled-accent"
                />
                <span className="text-sm text-amoled-text">Path-style URLs</span>
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="btn-secondary"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button type="submit" className="btn-primary flex-1">
                {editingId ? 'Update Connection' : 'Create Connection'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto p-6"
    >
      <div className="card p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amoled-text mb-2">StellarS3</h1>
            <p className="text-amoled-text-secondary">
              Connect to any S3-compatible storage service
            </p>
          </div>
          {connections.length > 0 && (
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          )}
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-amoled-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe className="w-8 h-8 text-amoled-accent" />
            </div>
            <h2 className="text-xl font-semibold text-amoled-text mb-2">
              Welcome to StellarS3
            </h2>
            <p className="text-amoled-text-secondary mb-8">
              Get started by adding your first S3 connection
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-amoled-text">
                  Your Connections
                </h2>
                <p className="text-amoled-text-secondary text-sm">
                  Click any connection to connect, or edit to modify settings
                </p>
              </div>
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Connection
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connections.map((connection) => {
                const preset = PROVIDER_PRESETS[connection.provider_type];
                const Icon = preset.icon;
                
                return (
                  <motion.div
                    key={connection.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`card p-6 transition-all duration-200 hover:shadow-amoled-lg ${
                      connection.is_active ? 'ring-2 ring-amoled-accent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-amoled-accent/10 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-amoled-accent" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-amoled-text">
                            {connection.name}
                          </h3>
                          <p className="text-sm text-amoled-text-secondary">
                            {preset.name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(connection);
                          }}
                          className="p-2 text-amoled-text-muted hover:text-amoled-text hover:bg-amoled-gray rounded-lg transition-colors"
                          title="Edit Connection"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(connection.id);
                          }}
                          className="p-2 text-amoled-text-muted hover:text-amoled-error hover:bg-amoled-error/10 rounded-lg transition-colors"
                          title="Delete Connection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-amoled-text-muted">Endpoint:</span>
                        <span className="text-amoled-text font-mono">
                          {connection.config.endpoint}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amoled-text-muted">Region:</span>
                        <span className="text-amoled-text">
                          {connection.config.region}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amoled-text-muted">Created:</span>
                        <span className="text-amoled-text">
                          {new Date(connection.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => onConnectionSelect(connection)}
                        className={`btn-primary flex-1 ${
                          connection.is_active ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={connection.is_active}
                      >
                        {connection.is_active ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Connected
                          </>
                        ) : (
                          'Connect'
                        )}
                      </button>
                      {connection.is_active && (
                        <span className="text-xs text-amoled-success flex items-center px-2">
                          Active
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ConnectionManager;