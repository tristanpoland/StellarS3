import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-amoled-success" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-amoled-error" />;
      case 'info':
        return <Info className="w-5 h-5 text-amoled-accent" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-amoled-success/10 border-amoled-success/20';
      case 'error':
        return 'bg-amoled-error/10 border-amoled-error/20';
      case 'info':
        return 'bg-amoled-accent/10 border-amoled-accent/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg border ${getBgColor()} backdrop-blur-sm`}
    >
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium text-amoled-text">{message}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default Toast;