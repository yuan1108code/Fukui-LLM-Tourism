import React from 'react';
import QRCodeDisplay from './QRCodeDisplay';

// 模擬位置資料
const testLocation = {
  id: "location_0",
  title: "越前海岸",
  content: "Rating: 4.4/5.0 (53 reviews)\nAddress: 日本、〒910-3556 福井県福井市赤坂町\nPhone: 0778-37-1234\nWebsite: https://www.town-echizen.jp/about/feature.php?id=6",
  metadata: {
    source_type: "locations",
    category: "attraction",
    city: "福井市",
    rating: 4.4,
    phone: "0778-37-1234",
    website: "https://www.town-echizen.jp/about/feature.php?id=6",
    address: "日本、〒910-3556 福井県福井市赤坂町",
    unique_key: "福井市_越前海岸(這好像是在南越前町?)_35.981821_135.958295",
    original_location_name: "越前海岸(這好像是在南越前町?)"
  },
  coordinates: {
    lat: 35.98182088027779,
    lng: 135.9582950588846
  }
};

const QRCodeTest: React.FC = () => {
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">QR Code 測試頁面</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Location Information</h2>
        
        <div className="mb-4">
          <h3 className="font-bold text-lg">{testLocation.title}</h3>
          <p className="text-sm text-gray-600 mb-2">
            城市: {testLocation.metadata.city}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            座標: {testLocation.coordinates.lat}, {testLocation.coordinates.lng}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Unique Key: {testLocation.metadata.unique_key}
          </p>
        </div>
        
        {/* QR Code 元件 */}
        <QRCodeDisplay location={testLocation} />
      </div>
    </div>
  );
};

export default QRCodeTest;
