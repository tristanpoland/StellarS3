import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Download, 
  Keyboard, 
  Save,
  X
} from 'lucide-react';
import { AppSettings } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface SettingsProps {
  onClose: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'amoled',
  view_mode: {
    type: 'grid',
    icon_size: 'medium'
  },
  show_hidden_files: false,
  auto_refresh_interval: 30,
  default_download_path: '',
  keyboard_shortcuts: {
    'upload': 'Ctrl+U',
    'refresh': 'Ctrl+R',
    'search': 'Ctrl+F',
    'delete': 'Delete',
    'selectAll': 'Ctrl+A',
    'newFolder': 'Ctrl+Shift+N'
  }
};

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useLocalStorage<AppSettings>('stellar-settings', defaultSettings);
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);

  const handleSave = () => {
    setSettings(tempSettings);
    onClose();
  };

  const handleReset = () => {
    setTempSettings(defaultSettings);
  };

  return (
    <div className="fixed inset-0 bg-amoled-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="w-6 h-6 text-amoled-accent" />
              <h2 className="text-xl font-bold text-amoled-text">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-amoled-text-muted hover:text-amoled-text p-2 hover:bg-amoled-gray rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-8">
            {/* Appearance */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Palette className="w-5 h-5 text-amoled-accent" />
                <h3 className="text-lg font-semibold text-amoled-text">Appearance</h3>
              </div>
              
              <div className="space-y-4 ml-7">
                <div>
                  <label className="block text-sm font-medium text-amoled-text mb-2">
                    Theme
                  </label>
                  <select
                    value={tempSettings.theme}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      theme: e.target.value as any
                    }))}
                    className="input-field"
                  >
                    <option value="amoled">AMOLED Black</option>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-amoled-text mb-2">
                    Default View Mode
                  </label>
                  <select
                    value={tempSettings.view_mode.type}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      view_mode: {
                        ...prev.view_mode,
                        type: e.target.value as any
                      }
                    }))}
                    className="input-field"
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                    <option value="tree">Tree</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-amoled-text mb-2">
                    Icon Size
                  </label>
                  <select
                    value={tempSettings.view_mode.icon_size}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      view_mode: {
                        ...prev.view_mode,
                        icon_size: e.target.value as any
                      }
                    }))}
                    className="input-field"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={tempSettings.show_hidden_files}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        show_hidden_files: e.target.checked
                      }))}
                      className="rounded border-amoled-border bg-amoled-gray focus:ring-amoled-accent"
                    />
                    <span className="text-sm text-amoled-text">Show hidden files</span>
                  </label>
                </div>
              </div>
            </section>

            {/* File Operations */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Download className="w-5 h-5 text-amoled-accent" />
                <h3 className="text-lg font-semibold text-amoled-text">File Operations</h3>
              </div>
              
              <div className="space-y-4 ml-7">
                <div>
                  <label className="block text-sm font-medium text-amoled-text mb-2">
                    Auto-refresh interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={tempSettings.auto_refresh_interval}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      auto_refresh_interval: parseInt(e.target.value) || 0
                    }))}
                    className="input-field"
                    placeholder="30"
                  />
                  <p className="text-xs text-amoled-text-muted mt-1">
                    Set to 0 to disable auto-refresh
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-amoled-text mb-2">
                    Default download path
                  </label>
                  <input
                    type="text"
                    value={tempSettings.default_download_path}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      default_download_path: e.target.value
                    }))}
                    className="input-field"
                    placeholder="Leave empty to use system default"
                  />
                </div>
              </div>
            </section>

            {/* Keyboard Shortcuts */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Keyboard className="w-5 h-5 text-amoled-accent" />
                <h3 className="text-lg font-semibold text-amoled-text">Keyboard Shortcuts</h3>
              </div>
              
              <div className="space-y-3 ml-7">
                {Object.entries(tempSettings.keyboard_shortcuts).map(([action, shortcut]) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-sm text-amoled-text capitalize">
                      {action.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="bg-amoled-gray px-3 py-1 rounded font-mono text-sm text-amoled-text">
                      {shortcut}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-amoled-border">
            <button
              onClick={handleReset}
              className="btn-secondary"
            >
              Reset to Defaults
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;