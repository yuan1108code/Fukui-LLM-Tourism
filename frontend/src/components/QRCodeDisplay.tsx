import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Download, ExternalLink } from 'lucide-react';

interface QRCodeDisplayProps {
  location: any;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ location }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create unique_key based on location data
  const createUniqueKey = (location: any) => {
    // If unique_key exists in metadata, use it directly
    if (location.metadata?.unique_key) {
      return location.metadata.unique_key;
    }
    
    // 否則回到原本的建構方式
    const city = location.metadata?.city || '不明';
    const name = location.title || '不明';
    const lat = location.coordinates?.lat || 0;
    const lng = location.coordinates?.lng || 0;
    
    return `${city}_${name}_${lat.toString()}_${lng.toString()}`;
  };

      // Clean filename (same as Python version)
  const sanitizeFilename = (name: string) => {
    let sanitized = name.replace(/[\\/*?:"<>|]/g, '');
    sanitized = sanitized.replace(/\s/g, '_');
    return sanitized;
  };

      // Create QR Code file path
  const getQrCodePath = (location: any) => {
    const uniqueKey = createUniqueKey(location);
    const safeFilename = sanitizeFilename(uniqueKey) + '.png';
    const path = `/QRcode_http/${safeFilename}`;
    
    console.log('建立 QR Code 路徑:', {
      city: location.metadata?.city,
      title: location.title,
      coordinates: location.coordinates,
      uniqueKey,
      safeFilename,
      path
    });
    
    return path;
  };

      // Check if QR Code file exists
  useEffect(() => {
    const checkQrCodeExists = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const qrPath = getQrCodePath(location);
        console.log('嘗試載入 QR Code:', qrPath);
        
        // 嘗試載入圖片
        const img = new Image();
        img.onload = () => {
          console.log('QR Code 載入成功:', qrPath);
          setQrCodeUrl(qrPath);
          setIsLoading(false);
        };
        img.onerror = () => {
          console.error('QR Code 載入失敗:', qrPath);
          setError('QR Code file does not exist');
          setIsLoading(false);
        };
        img.src = qrPath;
        
      } catch (err) {
        console.error('載入 QR Code 時發生錯誤:', err);
        setError('Error loading QR Code');
        setIsLoading(false);
      }
    };

    if (location && location.coordinates) {
      checkQrCodeExists();
    } else {
      setError('Location coordinate information incomplete');
      setIsLoading(false);
    }
  }, [location]);

  // Download QR Code
  const downloadQrCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `${location.title || 'Location'}_QRCode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 開啟原始 QR Code 鏈結
  const openQrCodeLink = () => {
    // 這裡可以根據需要實作開啟 QR Code 指向的 URL
    // 目前只是提示功能
    alert('QR Code points to detailed information page for this attraction');
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 p-3 rounded-lg">
        <h3 className="text-md font-bold mb-2 text-gray-800 flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          QR Code
        </h3>
        <div className="flex items-center justify-center h-32 bg-gray-100 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
        </div>
      </div>
    );
  }

  if (error || !qrCodeUrl) {
    return (
      <div className="bg-gray-50 p-3 rounded-lg">
        <h3 className="text-md font-bold mb-2 text-gray-800 flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          QR Code
        </h3>
        <div className="flex items-center justify-center h-32 bg-gray-100 rounded">
          <p className="text-gray-500 text-sm text-center">
            {error || 'QR Code not available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-md font-bold mb-3 text-indigo-800 flex items-center gap-2">
        <QrCode className="w-5 h-5" />
        QR Code
      </h3>
      
      <div className="flex flex-col items-center space-y-3">
        {/* QR Code 圖片 */}
        <motion.div
          className="bg-white p-3 rounded-lg shadow-sm border border-gray-200"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <img 
            src={qrCodeUrl} 
            alt="Attraction QR Code"
            className="w-32 h-32 object-contain"
          />
        </motion.div>
        
        {/* 說明文字 */}
        <p className="text-sm text-indigo-700 text-center">
          Scan this QR Code to get detailed attraction information
        </p>
        
        {/* 操作按鈕 */}
        <div className="flex gap-2 w-full">
          <motion.button
            onClick={downloadQrCode}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-3 h-3" />
            Download
          </motion.button>
          
          <motion.button
            onClick={openQrCodeLink}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ExternalLink className="w-3 h-3" />
            Preview
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default QRCodeDisplay;
