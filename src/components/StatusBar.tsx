import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  Clock,
  Loader2
} from 'lucide-react';
import { ConnectionProfile, FileOperation } from '../types';

interface StatusBarProps {
  activeConnection: ConnectionProfile | null;
  currentBucket: string;
  currentPath: string;
  objectCount: number;
  fileOperations: FileOperation[];
}

const StatusBar: React.FC<StatusBarProps> = ({
  activeConnection,
  currentBucket,
  currentPath,
  objectCount,
  fileOperations
}) => {
  const activeOperations = fileOperations.filter(op => op.status === 'in_progress');
  const completedOperations = fileOperations.filter(op => op.status === 'completed');
  const failedOperations = fileOperations.filter(op => op.status === 'failed');

  const formatPath = () => {
    if (!currentBucket) return 'No bucket selected';
    if (!currentPath) return `/${currentBucket}`;
    return `/${currentBucket}/${currentPath}`;
  };

  return (
    <div className="border-t border-amoled-border bg-amoled-dark px-4 py-2 flex items-center justify-between text-xs text-amoled-text-muted">
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          {activeConnection ? (
            <>
              <Wifi className="w-3 h-3 text-amoled-success" />
              <span>Connected to {activeConnection.name}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-amoled-error" />
              <span>Not connected</span>
            </>
          )}
        </div>

        {/* Current Path */}
        <div className="flex items-center space-x-2">
          <span>Path: {formatPath()}</span>
        </div>

        {/* Object Count */}
        {currentBucket && (
          <div className="flex items-center space-x-2">
            <span>{objectCount} item{objectCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Active Operations */}
        {activeOperations.length > 0 && (
          <div className="flex items-center space-x-2">
            <Loader2 className="w-3 h-3 animate-spin text-amoled-accent" />
            <span>{activeOperations.length} operation{activeOperations.length !== 1 ? 's' : ''} running</span>
          </div>
        )}

        {/* Operation Summary */}
        {(completedOperations.length > 0 || failedOperations.length > 0) && (
          <div className="flex items-center space-x-3">
            {completedOperations.length > 0 && (
              <span className="text-amoled-success">
                ✓ {completedOperations.length} completed
              </span>
            )}
            {failedOperations.length > 0 && (
              <span className="text-amoled-error">
                ✗ {failedOperations.length} failed
              </span>
            )}
          </div>
        )}

        {/* Current Time */}
        <div className="flex items-center space-x-2">
          <Clock className="w-3 h-3" />
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;