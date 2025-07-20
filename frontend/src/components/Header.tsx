import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, MessageCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  isMapView: boolean;
  onToggleView: () => void;
  healthStatus: 'checking' | 'healthy' | 'unhealthy';
  onRefresh: () => void;
}

const Header: React.FC<HeaderProps> = ({ isMapView, onToggleView, healthStatus, onRefresh }) => {
  return (
    <motion.header 
      className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo and title */}
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
          福
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 font-jp">
            Fukui Tourism AI Assistant
          </h1>
          <p className="text-sm text-gray-500">
            AI-powered shrine and attraction exploration experience
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-4">
        {/* Connection status indicator */}
        <div className="flex items-center space-x-2 text-sm">
          {healthStatus === 'healthy' && (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-600">Connected</span>
            </>
          )}
          {healthStatus === 'unhealthy' && (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-red-600">Connection Error</span>
            </>
          )}
          {healthStatus === 'checking' && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4 text-blue-500" />
              </motion.div>
              <span className="text-blue-600">Checking...</span>
            </>
          )}
        </div>

        {/* Refresh button */}
        <motion.button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Reload"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </motion.button>

        {/* View toggle button */}
        <motion.button
          onClick={onToggleView}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isMapView
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isMapView ? (
            <>
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Chat Only</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Map View</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.header>
  );
};

export default Header;
