import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { 
  Grid, 
  List, 
  Upload, 
  Download,
  Trash2,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  FolderOpen,
  File,
  Search,
  Eye,
  ChevronRight,
  ChevronDown,
  Folder
} from 'lucide-react';
import { ConnectionProfile, S3Object, FileOperation } from '../types';

interface FileExplorerProps {
  activeConnection: ConnectionProfile | null;
  currentBucket: string;
  currentPath: string;
  objects: S3Object[];
  loading: boolean;
  onPathChange: (path: string) => void;
  onRefresh: () => void;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
  fileOperations: FileOperation[];
  onFileOperationUpdate: (operations: FileOperation[]) => void;
}

type ViewMode = 'grid' | 'list' | 'tree';

const FileExplorer: React.FC<FileExplorerProps> = ({
  activeConnection,
  currentBucket,
  currentPath,
  objects,
  loading,
  onPathChange,
  onRefresh,
  onToast,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [displayedObjects, setDisplayedObjects] = useState<S3Object[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const ITEMS_PER_PAGE = 50;

  const getFileIcon = (object: S3Object) => {
    if (object.is_dir) return FolderOpen;
    
    const extension = object.key.split('.').pop()?.toLowerCase();
    const contentType = object.content_type?.toLowerCase();
    
    if (contentType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
      return Image;
    }
    if (contentType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(extension || '')) {
      return Video;
    }
    if (contentType?.startsWith('audio/') || ['mp3', 'wav', 'flac', 'ogg'].includes(extension || '')) {
      return Music;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return Archive;
    }
    if (['js', 'ts', 'py', 'java', 'cpp', 'html', 'css', 'json', 'xml'].includes(extension || '')) {
      return Code;
    }
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const filteredObjects = useMemo(() => {
    // Create a Set to track folders we've already added
    const addedFolders = new Set<string>();
    const result: S3Object[] = [];

    // First filter by current path
    const pathFilteredObjects = objects.filter(obj => {
      if (!currentPath) {
        // At root level - show all direct items
        return true;
      } else {
        // In a folder - show items that start with current path
        return obj.key.startsWith(currentPath + '/') || obj.key === currentPath;
      }
    });

    // Process each object to show direct children only
    pathFilteredObjects.forEach(obj => {
      if (!currentPath) {
        // At root - show files and create folder objects for directories
        const pathParts = obj.key.split('/');
        if (pathParts.length === 1) {
          // Direct file
          result.push(obj);
        } else {
          // File in subdirectory - create folder object
          const folderName = pathParts[0];
          if (!addedFolders.has(folderName)) {
            addedFolders.add(folderName);
            result.push({
              key: folderName,
              size: 0,
              is_dir: true,
              content_type: 'directory'
            });
          }
        }
      } else {
        // In a folder
        const relativePath = obj.key.substring(currentPath.length + 1);
        if (!relativePath) return; // Skip the folder itself
        
        const pathParts = relativePath.split('/');
        if (pathParts.length === 1) {
          // Direct child (file or folder)
          result.push(obj);
        } else {
          // File in subdirectory - create folder object
          const folderName = pathParts[0];
          const folderPath = currentPath + '/' + folderName;
          if (!addedFolders.has(folderPath)) {
            addedFolders.add(folderPath);
            result.push({
              key: folderPath,
              size: 0,
              is_dir: true,
              content_type: 'directory'
            });
          }
        }
      }
    });

    // Then filter by search query
    return result.filter(obj =>
      obj.key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [objects, currentPath, searchQuery]);

  const sortedObjects = useMemo(() => {
    return [...filteredObjects].sort((a, b) => {
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;
      return a.key.localeCompare(b.key);
    });
  }, [filteredObjects]);

  // Reset pagination when path or search changes
  useEffect(() => {
    setDisplayedObjects([]);
    setPage(0);
    setHasMore(true);
    loadNextPage(0, sortedObjects);
  }, [currentPath, searchQuery]);

  // Update displayed objects when sortedObjects changes
  useEffect(() => {
    if (page === 0) {
      loadNextPage(0, sortedObjects);
    }
  }, [sortedObjects]);

  // Load next page of items
  const loadNextPage = useCallback((pageNum: number, allObjects: S3Object[] = sortedObjects) => {
    const startIndex = pageNum * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageItems = allObjects.slice(startIndex, endIndex);
    
    if (pageNum === 0) {
      setDisplayedObjects(pageItems);
    } else {
      setDisplayedObjects(prev => [...prev, ...pageItems]);
    }
    
    setHasMore(endIndex < allObjects.length);
    setLoadingMore(false);
  }, [ITEMS_PER_PAGE]);

  // Load more items when user scrolls near bottom
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200;
    
    if (isNearBottom && hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      setTimeout(() => loadNextPage(nextPage), 100); // Small delay to prevent rapid firing
    }
  }, [hasMore, loadingMore, loading, page, loadNextPage]);

  // Create hierarchical tree structure for tree view (only for displayed objects)
  const treeStructure = useMemo(() => {
    if (viewMode !== 'tree') return [];
    
    const tree: any[] = [];
    const pathMap = new Map();
    
    displayedObjects.forEach(obj => {
      const pathParts = obj.key.split('/');
      let currentPath = '';
      
      pathParts.forEach((part, index) => {
        currentPath = index === 0 ? part : `${currentPath}/${part}`;
        
        if (!pathMap.has(currentPath)) {
          const node = {
            key: currentPath,
            name: part,
            is_dir: index < pathParts.length - 1 || obj.is_dir,
            level: index,
            expanded: expandedFolders.has(currentPath),
            children: [],
            ...obj
          };
          
          pathMap.set(currentPath, node);
          
          if (index === 0) {
            tree.push(node);
          } else {
            const parentPath = pathParts.slice(0, index).join('/');
            const parent = pathMap.get(parentPath);
            if (parent) {
              parent.children.push(node);
            }
          }
        }
      });
    });
    
    return tree;
  }, [displayedObjects, viewMode, expandedFolders]);

  const handleObjectClick = (object: S3Object) => {
    if (object.is_dir) {
      const newPath = object.key;
      onPathChange(newPath);
    }
  };

  const toggleFolderExpansion = (folderKey: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderKey)) {
        newSet.delete(folderKey);
      } else {
        newSet.add(folderKey);
      }
      return newSet;
    });
  };

  const handleObjectDoubleClick = async (object: S3Object) => {
    if (!object.is_dir && activeConnection) {
      // For files, generate a presigned URL and open it
      try {
        const url = await invoke<string>('get_presigned_url', {
          config: activeConnection.config,
          request: {
            bucket: currentBucket,
            key: object.key,
            expires_in: 3600,
            method: 'GET'
          }
        });
        await open(url);
      } catch (error) {
        onToast(`Failed to open file: ${error}`, 'error');
      }
    }
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !activeConnection) return;

    for (const file of Array.from(files)) {
      const key = currentPath ? `${currentPath}/${file.name}` : file.name;
      
      try {
        // Read file as array buffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        await invoke('upload_data', {
          config: activeConnection.config,
          bucket: currentBucket,
          key,
          data: Array.from(bytes)
        });
        
        onToast(`Uploaded ${file.name}`, 'success');
      } catch (error) {
        onToast(`Failed to upload ${file.name}: ${error}`, 'error');
      }
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Refresh the view
    onRefresh();
  };

  const handleDownload = async (object: S3Object) => {
    if (!activeConnection || object.is_dir) return;

    try {
      // For now, we'll generate a presigned URL
      const url = await invoke<string>('get_presigned_url', {
        config: activeConnection.config,
        request: {
          bucket: currentBucket,
          key: object.key,
          expires_in: 3600,
          method: 'GET'
        }
      });
      
      // Open the download URL
      await open(url);
      onToast(`Download started for ${object.key}`, 'success');
    } catch (error) {
      onToast(`Failed to download ${object.key}: ${error}`, 'error');
    }
  };

  const handleDelete = async (object: S3Object) => {
    if (!activeConnection) return;

    if (confirm(`Are you sure you want to delete ${object.key}?`)) {
      try {
        await invoke('delete_object', {
          config: activeConnection.config,
          bucket: currentBucket,
          key: object.key
        });
        
        onToast(`Deleted ${object.key}`, 'success');
        onRefresh();
      } catch (error) {
        onToast(`Failed to delete ${object.key}: ${error}`, 'error');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (!activeConnection) return;

    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      const key = currentPath ? `${currentPath}/${file.name}` : file.name;
      
      try {
        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        await invoke('upload_data', {
          config: activeConnection.config,
          bucket: currentBucket,
          key,
          data: Array.from(bytes)
        });
        
        onToast(`Uploaded ${file.name}`, 'success');
      } catch (error) {
        onToast(`Failed to upload ${file.name}: ${error}`, 'error');
      }
    }
    
    onRefresh();
  };

  const pathSegments = currentPath.split('/').filter(Boolean);

  // Recursive tree node renderer
  const TreeNode = ({ node, level = 0 }: { node: any; level?: number }) => {
    const Icon = getFileIcon(node);
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.key}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-2 p-2 mx-2 rounded-lg hover:bg-amoled-gray cursor-pointer group transition-colors"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {node.is_dir && hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpansion(node.key);
              }}
              className="p-1 text-amoled-text-muted hover:text-amoled-text transition-colors"
            >
              {node.expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          {(!node.is_dir || !hasChildren) && <div className="w-6" />}
          
          <div
            className="flex items-center space-x-2 flex-1 min-w-0"
            onClick={() => handleObjectClick(node)}
            onDoubleClick={() => handleObjectDoubleClick(node)}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${node.is_dir ? 'text-amoled-accent' : 'text-amoled-text-muted'}`} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-amoled-text truncate text-sm">
                {node.name}
              </div>
              {!node.is_dir && (
                <div className="text-xs text-amoled-text-muted">
                  {formatFileSize(node.size)}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!node.is_dir && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(node);
                  }}
                  className="p-1 text-amoled-text-muted hover:text-amoled-text hover:bg-amoled-dark rounded transition-colors"
                  title="Download"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleObjectDoubleClick(node);
                  }}
                  className="p-1 text-amoled-text-muted hover:text-amoled-text hover:bg-amoled-dark rounded transition-colors"
                  title="Preview"
                >
                  <Eye className="w-3 h-3" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(node);
              }}
              className="p-1 text-amoled-text-muted hover:text-amoled-error hover:bg-amoled-error/10 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
        
        {node.is_dir && node.expanded && hasChildren && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {node.children.map((child: any) => (
                <TreeNode key={child.key} node={child} level={level + 1} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    );
  };

  if (!currentBucket) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 text-amoled-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-amoled-text mb-2">
            Select a Bucket
          </h3>
          <p className="text-amoled-text-secondary">
            Choose a bucket from the sidebar to start browsing files
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-amoled-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-amoled-text">
              {currentBucket}
            </h2>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-amoled-accent text-amoled-black'
                    : 'text-amoled-text-muted hover:text-amoled-text hover:bg-amoled-gray'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-amoled-accent text-amoled-black'
                    : 'text-amoled-text-muted hover:text-amoled-text hover:bg-amoled-gray'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-amoled-accent text-amoled-black'
                    : 'text-amoled-text-muted hover:text-amoled-text hover:bg-amoled-gray'
                }`}
                title="Tree View"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="btn-secondary"
            >
              <Search className="w-4 h-4" />
            </button>
            <button onClick={handleUpload} className="btn-primary">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => onPathChange('')}
            className="text-amoled-accent hover:text-amoled-accent-hover"
          >
            {currentBucket}
          </button>
          {pathSegments.map((segment, index) => (
            <React.Fragment key={index}>
              <span className="text-amoled-text-muted">/</span>
              <button
                onClick={() => onPathChange(pathSegments.slice(0, index + 1).join('/'))}
                className="text-amoled-accent hover:text-amoled-accent-hover"
              >
                {segment}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full max-w-md"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* File List */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-auto p-4 ${dragOver ? 'bg-amoled-accent/5 border-2 border-dashed border-amoled-accent' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onScroll={handleScroll}
      >
        {loading && displayedObjects.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="loading-spinner w-8 h-8"></div>
          </div>
        ) : displayedObjects.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <File className="w-16 h-16 text-amoled-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-amoled-text mb-2">
                No Files Found
              </h3>
              <p className="text-amoled-text-secondary mb-4">
                This folder is empty or no files match your search.
              </p>
              <button onClick={handleUpload} className="btn-primary">
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </button>
            </div>
          </div>
        ) : viewMode === 'tree' ? (
          <div className="flex-1 p-2">
            {treeStructure.map((node) => (
              <TreeNode key={node.key} node={node} level={0} />
            ))}
            {loadingMore && (
              <div className="flex items-center justify-center p-4">
                <div className="loading-spinner w-6 h-6"></div>
                <span className="ml-2 text-amoled-text-muted">Loading more...</span>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {displayedObjects.map((object) => {
              const Icon = getFileIcon(object);
              return (
                <motion.div
                  key={object.key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative"
                >
                  <div
                    className="card p-4 cursor-pointer hover:shadow-amoled transition-all duration-200"
                    onClick={() => handleObjectClick(object)}
                    onDoubleClick={() => handleObjectDoubleClick(object)}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Icon className={`w-8 h-8 ${object.is_dir ? 'text-amoled-accent' : 'text-amoled-text-muted'}`} />
                      <div className="text-center">
                        <div className="text-sm font-medium text-amoled-text truncate w-full">
                          {object.is_dir 
                            ? object.key.split('/').filter(Boolean).pop() || object.key
                            : object.key.split('/').pop()
                          }
                        </div>
                        {!object.is_dir && (
                          <div className="text-xs text-amoled-text-muted">
                            {formatFileSize(object.size)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Context Menu Button */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      {!object.is_dir && (
                        <>
                          <button
                            onClick={() => handleDownload(object)}
                            className="p-1 bg-amoled-dark hover:bg-amoled-gray rounded text-amoled-text-muted hover:text-amoled-text transition-colors"
                            title="Download"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleObjectDoubleClick(object)}
                            className="p-1 bg-amoled-dark hover:bg-amoled-gray rounded text-amoled-text-muted hover:text-amoled-text transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(object)}
                        className="p-1 bg-amoled-dark hover:bg-amoled-error rounded text-amoled-text-muted hover:text-white transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {loadingMore && (
              <div className="col-span-full flex items-center justify-center p-4">
                <div className="loading-spinner w-6 h-6"></div>
                <span className="ml-2 text-amoled-text-muted">Loading more...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {displayedObjects.map((object) => {
              const Icon = getFileIcon(object);
              return (
                <motion.div
                  key={object.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-amoled-gray cursor-pointer group transition-colors"
                  onClick={() => handleObjectClick(object)}
                  onDoubleClick={() => handleObjectDoubleClick(object)}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${object.is_dir ? 'text-amoled-accent' : 'text-amoled-text-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-amoled-text truncate">
                      {object.is_dir 
                        ? object.key.split('/').filter(Boolean).pop() || object.key
                        : object.key.split('/').pop()
                      }
                    </div>
                    <div className="text-sm text-amoled-text-muted">
                      {object.is_dir ? 'Folder' : formatFileSize(object.size)}
                      {object.last_modified && (
                        <span className="ml-2">• {formatDate(object.last_modified)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!object.is_dir && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(object);
                          }}
                          className="p-2 text-amoled-text-muted hover:text-amoled-text hover:bg-amoled-dark rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleObjectDoubleClick(object);
                          }}
                          className="p-2 text-amoled-text-muted hover:text-amoled-text hover:bg-amoled-dark rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(object);
                      }}
                      className="p-2 text-amoled-text-muted hover:text-amoled-error hover:bg-amoled-error/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
            {loadingMore && (
              <div className="flex items-center justify-center p-4">
                <div className="loading-spinner w-6 h-6"></div>
                <span className="ml-2 text-amoled-text-muted">Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 bg-amoled-accent/10 border-2 border-dashed border-amoled-accent flex items-center justify-center pointer-events-none">
          <div className="bg-amoled-dark p-6 rounded-lg border border-amoled-accent">
            <Upload className="w-12 h-12 text-amoled-accent mx-auto mb-2" />
            <p className="text-amoled-text font-medium">Drop files to upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;