import React from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  RefreshCw, 
  Folder, 
  FolderOpen,
  Database,
  Loader2
} from 'lucide-react';
import { ConnectionProfile, S3Bucket } from '../types';

interface SidebarProps {
  connections: ConnectionProfile[];
  activeConnection: ConnectionProfile | null;
  buckets: S3Bucket[];
  currentBucket: string;
  onConnectionChange: () => void;
  onBucketSelect: (bucket: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  connections,
  activeConnection,
  buckets,
  currentBucket,
  onConnectionChange,
  onBucketSelect,
  onRefresh,
  loading
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="sidebar w-80 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-amoled-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-amoled-text">Connections</h2>
          <div className="flex space-x-1">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-amoled-text-muted hover:text-amoled-text hover:bg-amoled-gray rounded-lg transition-all duration-200"
              title="Refresh"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onConnectionChange}
              className="p-2 text-amoled-text-muted hover:text-amoled-text hover:bg-amoled-gray rounded-lg transition-all duration-200"
              title="Manage Connections"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {activeConnection && (
          <div className="bg-amoled-gray p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Database className="w-4 h-4 text-amoled-accent" />
              <span className="font-medium text-amoled-text text-sm">
                {activeConnection.name}
              </span>
            </div>
            <p className="text-xs text-amoled-text-muted">
              {activeConnection.config.endpoint}
            </p>
          </div>
        )}
      </div>

      {/* Buckets List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-amoled-text-secondary mb-3">
            Buckets ({buckets.length})
          </h3>
          
          {loading && buckets.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amoled-accent" />
            </div>
          ) : buckets.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="w-8 h-8 text-amoled-text-muted mx-auto mb-2" />
              <p className="text-sm text-amoled-text-muted">No buckets found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {buckets.map((bucket) => (
                <motion.button
                  key={bucket.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => onBucketSelect(bucket.name)}
                  className={`w-full p-3 rounded-lg text-left transition-all duration-200 group ${
                    currentBucket === bucket.name
                      ? 'bg-amoled-accent/10 border border-amoled-accent text-amoled-text'
                      : 'hover:bg-amoled-gray text-amoled-text-secondary hover:text-amoled-text'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {currentBucket === bucket.name ? (
                      <FolderOpen className="w-5 h-5 text-amoled-accent flex-shrink-0" />
                    ) : (
                      <Folder className="w-5 h-5 text-amoled-text-muted group-hover:text-amoled-text flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {bucket.name}
                      </div>
                      {bucket.creation_date && (
                        <div className="text-xs text-amoled-text-muted">
                          Created {formatDate(bucket.creation_date)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-amoled-border">
        <div className="text-xs text-amoled-text-muted space-y-1">
          <div>StellarS3 v1.0.0</div>
          <div>{connections.length} connection{connections.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;