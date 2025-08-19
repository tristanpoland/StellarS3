import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import ConnectionManager from './components/ConnectionManager';
import StatusBar from './components/StatusBar';
import Toast from './components/Toast';
import { ConnectionProfile, S3Config, S3Bucket, S3Object, FileOperation } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  const [connections, setConnections] = useLocalStorage<ConnectionProfile[]>('stellar-connections', []);
  const [activeConnection, setActiveConnection] = useState<ConnectionProfile | null>(null);
  const [currentBucket, setCurrentBucket] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [allObjects, setAllObjects] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showConnectionManager, setShowConnectionManager] = useState<boolean>(false);
  const [fileOperations, setFileOperations] = useState<FileOperation[]>([]);
  const [toasts, setToasts] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);

  useEffect(() => {
    console.log('useEffect triggered - connections:', connections.length, 'showConnectionManager:', showConnectionManager, 'activeConnection:', activeConnection?.name);
    if (connections.length === 0) {
      console.log('No connections, showing connection manager');
      setShowConnectionManager(true);
      setActiveConnection(null);
    } else if (!activeConnection && !showConnectionManager) {
      // Only auto-select if no connection is active and we're not showing the manager
      const active = connections.find(conn => conn.is_active);
      console.log('Found active connection for auto-select:', active?.name);
      if (active) {
        console.log('Auto-setting active connection and loading buckets');
        setActiveConnection(active);
        loadBuckets(active.config);
      } else {
        // If there are connections but none active, show connection manager
        console.log('Connections exist but none active, showing connection manager');
        setShowConnectionManager(true);
      }
    }
  }, [connections]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const loadBuckets = async (config: S3Config) => {
    setLoading(true);
    try {
      const result = await invoke<S3Bucket[]>('list_buckets', { config });
      setBuckets(result);
    } catch (error) {
      addToast(`Failed to load buckets: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAllObjects = async (bucket: string) => {
    if (!activeConnection) return;
    
    console.log('Loading ALL objects for search in bucket:', bucket);
    try {
      const result = await invoke<S3Object[]>('list_all_objects', {
        config: activeConnection.config,
        bucket
      });
      console.log(`Loaded ${result.length} total objects:`, result);
      setAllObjects(result);
    } catch (error) {
      console.error('Failed to load all objects:', error);
      addToast(`Failed to load all objects: ${error}`, 'error');
    }
  };

  const loadObjects = async (bucket: string, prefix?: string) => {
    if (!activeConnection) return;
    
    setLoading(true);
    try {
      const result = await invoke<S3Object[]>('list_objects', {
        config: activeConnection.config,
        bucket,
        prefix: prefix || null
      });
      setObjects(result);
    } catch (error) {
      addToast(`Failed to load objects: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionSelect = (connection: ConnectionProfile) => {
    console.log('handleConnectionSelect called with:', connection.name);
    console.log('Current connections before update:', connections);
    
    // Update the connections array to mark this one as active
    const updatedConnections = connections.map(conn => ({
      ...conn,
      is_active: conn.id === connection.id
    }));
    setConnections(updatedConnections);
    
    // Set active connection immediately to prevent null state
    setActiveConnection({...connection, is_active: true});
    setShowConnectionManager(false);
    
    setCurrentBucket('');
    setCurrentPath('');
    console.log('About to load buckets...');
    loadBuckets(connection.config);
  };

  const handleBucketSelect = (bucket: string) => {
    setCurrentBucket(bucket);
    setCurrentPath('');
    // Load both the current folder view AND all objects for search
    loadObjects(bucket);
    loadAllObjects(bucket);
  };

  const handlePathChange = (path: string) => {
    setCurrentPath(path);
    if (currentBucket) {
      loadObjects(currentBucket, path);
    }
  };

  const handleRefresh = () => {
    if (currentBucket) {
      loadObjects(currentBucket, currentPath);
      // Also refresh all objects for search
      loadAllObjects(currentBucket);
    } else if (activeConnection) {
      loadBuckets(activeConnection.config);
    }
  };

  console.log('Render check - showConnectionManager:', showConnectionManager, 'activeConnection:', activeConnection?.name);
  
  if (showConnectionManager || !activeConnection) {
    console.log('Rendering connection manager');
    return (
      <div className="h-screen bg-amoled-black flex items-center justify-center">
        <ConnectionManager
          connections={connections}
          onConnectionsChange={setConnections}
          onConnectionSelect={handleConnectionSelect}
          onClose={() => setShowConnectionManager(false)}
        />
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast key={toast.id} {...toast} />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  console.log('Rendering main interface with buckets:', buckets.length);
  
  return (
    <div className="h-screen bg-amoled-black text-amoled-text flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          connections={connections}
          activeConnection={activeConnection}
          buckets={buckets}
          currentBucket={currentBucket}
          onConnectionChange={() => setShowConnectionManager(true)}
          onBucketSelect={handleBucketSelect}
          onRefresh={handleRefresh}
          loading={loading}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <FileExplorer
            activeConnection={activeConnection}
            currentBucket={currentBucket}
            currentPath={currentPath}
            objects={objects}
            allObjects={allObjects}
            loading={loading}
            onPathChange={handlePathChange}
            onRefresh={handleRefresh}
            onToast={addToast}
            fileOperations={fileOperations}
            onFileOperationUpdate={setFileOperations}
          />
        </div>
      </div>
      
      <StatusBar
        activeConnection={activeConnection}
        currentBucket={currentBucket}
        currentPath={currentPath}
        objectCount={objects.length}
        fileOperations={fileOperations}
      />

      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default App;