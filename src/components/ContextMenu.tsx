import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Trash2, 
  Copy, 
  Move, 
  Eye, 
  Edit3, 
  Info,
  Link
} from 'lucide-react';

interface ContextMenuItem {
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  const adjustedPosition = React.useMemo(() => {
    if (!menuRef.current) return { x, y };

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust X position
    if (x + menuRect.width > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - 10;
    }

    // Adjust Y position
    if (y + menuRect.height > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - 10;
    }

    return { x: adjustedX, y: adjustedY };
  }, [x, y]);

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="context-menu absolute min-w-48"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => {
                if (!item.disabled) {
                  item.action();
                  onClose();
                }
              }}
              disabled={item.disabled}
              className={`context-menu-item w-full flex items-center space-x-3 ${
                item.destructive ? 'text-amoled-error hover:bg-amoled-error/10' : ''
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
};

// Hook for creating context menu items
export const useContextMenuItems = (object: any, callbacks: any) => {
  return React.useMemo(() => {
    const items: ContextMenuItem[] = [];

    if (!object.is_dir) {
      items.push({
        label: 'Download',
        icon: Download,
        action: () => callbacks.onDownload(object),
      });

      items.push({
        label: 'Preview',
        icon: Eye,
        action: () => callbacks.onPreview(object),
      });

      items.push({
        label: 'Copy Link',
        icon: Link,
        action: () => callbacks.onCopyLink(object),
      });
    }

    items.push({
      label: 'Copy',
      icon: Copy,
      action: () => callbacks.onCopy(object),
    });

    items.push({
      label: 'Move',
      icon: Move,
      action: () => callbacks.onMove(object),
    });

    if (!object.is_dir) {
      items.push({
        label: 'Rename',
        icon: Edit3,
        action: () => callbacks.onRename(object),
      });
    }

    items.push({
      label: 'Properties',
      icon: Info,
      action: () => callbacks.onProperties(object),
    });

    // Separator
    items.push({
      label: 'Delete',
      icon: Trash2,
      action: () => callbacks.onDelete(object),
      destructive: true,
    });

    return items;
  }, [object, callbacks]);
};

export default ContextMenu;