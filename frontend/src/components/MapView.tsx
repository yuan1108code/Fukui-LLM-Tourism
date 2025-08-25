import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { MapPin, Info, Navigation, Layers, UserCheck, Plus, Edit3 } from 'lucide-react';
import { LocationData } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import QRCodeDisplay from './QRCodeDisplay';
import EditLocationForm from './EditLocationForm';

// API 基礎 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create user location marker icon - using more prominent icon
const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [35, 55], // 比預設標記更大
  iconAnchor: [17, 55],
  popupAnchor: [1, -34],
  shadowSize: [55, 55]
});

// Create attraction marker icon - using blue
const attractionLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create shrine marker icon - using red to distinguish from attractions
const shrineLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create custom location marker icon - using yellow to distinguish from other types
const customLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapViewProps {
  locations: LocationData[];
  shrines?: LocationData[];  // Shrine data parameter
  customLocations?: LocationData[];  // User-defined custom locations
  isEditMode?: boolean;  // Edit mode state
  onAddCustomLocation?: (location: LocationData) => void;  // Callback for adding custom location
}

// Fukui Prefecture center coordinates
const FUKUI_CENTER: [number, number] = [35.943560, 136.188270];
const DEFAULT_ZOOM = 9;

// Map style options
const MAP_STYLES = [
  {
    id: 'openstreetmap',
    name: 'Standard Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  {
    id: 'satellite',
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
  },
  {
    id: 'terrain',
    name: 'Terrain Map',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  }
];

// Map click event handler component
const MapClickHandler: React.FC<{
  isEditMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
}> = ({ isEditMode, onMapClick }) => {
  useMapEvents({
    click: (e) => {
      if (isEditMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const MapView: React.FC<MapViewProps> = ({ 
  locations, 
  shrines = [], 
  customLocations = [],
  isEditMode = false,
  onAddCustomLocation
}) => {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [currentMapStyle, setCurrentMapStyle] = useState(0);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showAttractions, setShowAttractions] = useState(true);
  const [showShrines, setShowShrines] = useState(true);
  const [showCustomLocations, setShowCustomLocations] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clickedCoordinates, setClickedCoordinates] = useState<{lat: number, lng: number} | null>(null);

  // Helper function to check if attraction photo exists - simplified version
  const checkImageExists = async (imagePath: string): Promise<boolean> => {
    try {
      console.log(`🔍 檢查圖片: ${imagePath}`);
      
      const response = await fetch(imagePath, { 
        method: 'GET',
        cache: 'no-cache' // 暫時停用快取來確保檢查準確性
      });
      
      const exists = response.ok;
      console.log(`📋 圖片檢查結果: ${exists ? '✅ 存在' : '❌ 不存在'} (狀態碼: ${response.status}) - ${imagePath}`);
      
      return exists;
    } catch (error) {
      console.log(`❌ 圖片檢查錯誤: ${error} - ${imagePath}`);
      return false;
    }
  };

  // Function to get attraction preview image
  const getAttractionImage = async (locationName: string): Promise<string | null> => {
    // Clean location name, remove possible special characters
    let cleanName = locationName.replace(/[（）\(\)]/g, '').trim();
    
    // 名稱正規化映射 - 處理常見的名稱變化
    const nameMapping: { [key: string]: string[] } = {
      '足雨山公園': ['足羽山公園', '足雨山公園'],
      '足羽山公園': ['足羽山公園', '足雨山公園'],
      '原子力の科学館 あっとほうむ': ['あっとほうむ', '原子力の科学館', '原子力の科学館 あっとほうむ'],
      'あっとほうむ': ['あっとほうむ', '原子力の科学館', '原子力の科学館 あっとほうむ'],
      // 可以在這裡添加更多的名稱映射
    };
    
    // Get possible name variations
    let possibleNames = nameMapping[cleanName] || [cleanName];
    
    // 添加額外的名稱變化策略
    // 1. 移除空格
    possibleNames.push(cleanName.replace(/\s+/g, ''));
    // 2. 如果包含公園，也嘗試沒有公園的版本
    if (cleanName.includes('公園')) {
      possibleNames.push(cleanName.replace('公園', ''));
    }
    // 3. 如果包含多個部分（用空格分隔），嘗試各個部分
    if (cleanName.includes(' ')) {
      const parts = cleanName.split(' ');
      possibleNames.push(...parts);
      // 也嘗試倒序組合
      possibleNames.push(parts.reverse().join(' '));
    }
    // 4. 如果包含「の」，嘗試移除它
    if (cleanName.includes('の')) {
      possibleNames.push(cleanName.replace(/の/g, ''));
    }
    // 5. 如果是日文名稱，嘗試只用最後一部分
    if (/[ひらがなカタカナ]/.test(cleanName)) {
      const parts = cleanName.split(/\s+/);
      if (parts.length > 1) {
        possibleNames.push(parts[parts.length - 1]); // 最後一部分
        possibleNames.push(parts[0]); // 第一部分
      }
    }
    // 6. 去重
    possibleNames = [...new Set(possibleNames)];
    
    // Intelligent search based on possible prefectures/cities from location name
    const cityMappings = [
      '福井市', '敦賀市', '小濱市', '大野市', '勝山市', '鯖江市', 
      '蘆原市', '越前市', '坂井市', '永平寺町', '池田町', '南越前町', 
      '越前町', '美濱町', '高濱町', '大飯町', '若狹町'
    ];
    
    console.log(`🔍 搜尋圖片: ${cleanName} -> 可能的名稱: [${possibleNames.join(', ')}]`);
    
    // 依序檢查每個可能的路徑和名稱變化
    for (const city of cityMappings) {
      console.log(`📍 檢查城市: ${city}`);
      for (const name of possibleNames) {
        const imagePath = `${API_BASE_URL}/images/${city}/${name}.png`;
        if (await checkImageExists(imagePath)) {
          console.log(`🎉 Found attraction image: ${imagePath} (original name: ${cleanName})`);
          return imagePath;
        }
      }
    }
    
          console.log(`😞 Attraction image not found: ${cleanName} (tried variations: ${possibleNames.join(', ')})`);
    return null;
  };

  // Helper function to format detailed information
  const formatLocationDetails = (location: LocationData) => {
    const metadata = location.metadata || {};
    const details = {
      rating: metadata.rating || null,
      reviews: metadata.reviews || null,
      phone: metadata.phone || '未提供',
      website: metadata.url || metadata.website || null,
      address: metadata.address || null,
      coordinates: location.coordinates,
      type: metadata.type || '神社',
      openingHours: metadata.gate_open && metadata.gate_close ? 
        `${metadata.gate_open} - ${metadata.gate_close}` : null,
      admissionFee: metadata.admission_fee !== undefined ? 
        (metadata.admission_fee === 0 ? '免費' : `¥${metadata.admission_fee}`) : null,
      enshrined_deities: metadata.enshrined_deities || [],
      wheelchair_access: metadata.wheelchair_access,
      wifi: metadata.wifi,
      toilets: metadata.toilets,
      founded_year: metadata.founded_year || '不明'
    };
    
    return details;
  };

      // Get user location
  const getUserLocation = () => {
    return new Promise<{lat: number, lng: number}>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('瀏覽器不支援地理位置服務'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          resolve(location);
        },
        (error) => {
          console.warn('無法獲取用戶位置:', error.message);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5分鐘快取
        }
      );
    });
  };

      // Create Google Maps navigation URL
  const createGoogleMapsUrl = async (destination: {lat: number, lng: number}) => {
    try {
      let origin = '';
      
      // 嘗試獲取用戶位置
      if (!userLocation) {
        try {
          const location = await getUserLocation();
          origin = `${location.lat},${location.lng}`;
        } catch (error) {
          console.warn('使用用戶位置失敗，將使用瀏覽器預設位置');
        }
      } else {
        origin = `${userLocation.lat},${userLocation.lng}`;
      }

      // Create Google Maps URL
      const baseUrl = 'https://www.google.com/maps/dir/';
      const params = new URLSearchParams();
      params.set('api', '1');
      params.set('destination', `${destination.lat},${destination.lng}`);
      
      if (origin) {
        params.set('origin', origin);
        params.set('travelmode', 'driving'); // 預設為開車路線
      }

      return `${baseUrl}?${params.toString()}`;
    } catch (error) {
      // 如果獲取用戶位置失敗，就只用目的地
      return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    }
  };

  // Ensure locations with valid coordinates
  const validLocations = useMemo(() => 
    locations.filter((loc: LocationData) => 
      loc.coordinates && 
      loc.coordinates.lat && 
      loc.coordinates.lng &&
      !isNaN(loc.coordinates.lat) && 
      !isNaN(loc.coordinates.lng)
    ), [locations]
  );

  // Ensure shrines with valid coordinates
  const validShrines = useMemo(() => 
    shrines.filter((shrine: LocationData) => 
      shrine.coordinates && 
      shrine.coordinates.lat && 
      shrine.coordinates.lng &&
      !isNaN(shrine.coordinates.lat) && 
      !isNaN(shrine.coordinates.lng)
    ), [shrines]
  );

  // Ensure custom locations with valid coordinates
  const validCustomLocations = useMemo(() => 
    customLocations.filter((location: LocationData) => 
      location.coordinates && 
      location.coordinates.lat && 
      location.coordinates.lng &&
      !isNaN(location.coordinates.lat) && 
      !isNaN(location.coordinates.lng)
    ), [customLocations]
  );

  const totalValidMarkers = validLocations.length + validShrines.length + validCustomLocations.length;

  const currentStyle = MAP_STYLES[currentMapStyle];

  // 初始時嘗試獲取用戶位置
  useEffect(() => {
    getUserLocation().catch(() => {
      console.log('Unable to get user location, will only display attractions');
    });
    
    // 將測試函式加到全域物件，方便除錯
    (window as any).testImageSearch = async (locationName: string) => {
      console.log(`測試圖片搜尋: ${locationName}`);
      const result = await getAttractionImage(locationName);
      console.log(`搜尋結果: ${result || '未找到'}`);
      return result;
    };

    // Test specific attractions
    (window as any).testAtomicMuseum = () => {
      return (window as any).testImageSearch('原子力の科学館 あっとほうむ');
    };
  }, []);

  const cycleMapStyle = () => {
    setCurrentMapStyle((prev) => (prev + 1) % MAP_STYLES.length);
  };

      // Handle map click events
  const handleMapClick = (lat: number, lng: number) => {
    if (isEditMode) {
      setClickedCoordinates({ lat, lng });
      setIsFormOpen(true);
    }
  };

        // Handle adding new location
  const handleAddLocation = (newLocation: LocationData) => {
    if (onAddCustomLocation) {
      onAddCustomLocation(newLocation);
    }
    setIsFormOpen(false);
    setClickedCoordinates(null);
  };

  return (
    <div className="h-full relative">
      {/* Map style toggle button */}
      <motion.div 
        className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={cycleMapStyle}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          title={`Switch to: ${MAP_STYLES[(currentMapStyle + 1) % MAP_STYLES.length].name}`}
        >
          <Layers className="w-4 h-4" />
          {currentStyle.name}
        </button>
      </motion.div>

      {/* User location button */}
      <motion.div 
        className="absolute top-4 left-20 z-[1000] bg-white rounded-lg shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={() => getUserLocation().catch(() => alert('無法獲取您的位置，請檢查瀏覽器權限設定'))}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          title="Get My Location"
        >
          <UserCheck className="w-4 h-4" />
{userLocation ? 'Location Acquired' : 'Get My Location'}
        </button>
      </motion.div>
      {/* Edit mode indicator */}
      {isEditMode && (
        <motion.div 
          className="absolute top-20 left-4 z-[1000] bg-green-100 border border-green-300 rounded-lg shadow-lg px-4 py-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Edit3 className="w-4 h-4" />
            <span className="font-medium">Edit Mode</span>
          </div>
          <p className="text-xs text-green-600 mt-1">Click on map to add new location</p>
        </motion.div>
      )}

      <motion.div 
        className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg px-4 py-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <button
            onClick={() => setShowAttractions(!showAttractions)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${
              showAttractions 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title={showAttractions ? 'Hide attraction markers' : 'Show attraction markers'}
          >
            <div className={`w-3 h-3 rounded-full ${showAttractions ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <span>{validLocations.length} Attractions</span>
          </button>
          <button
            onClick={() => setShowShrines(!showShrines)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${
              showShrines 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title={showShrines ? 'Hide shrine & temple markers' : 'Show shrine & temple markers'}
          >
            <div className={`w-3 h-3 rounded-full ${showShrines ? 'bg-red-500' : 'bg-gray-300'}`}></div>
            <span>{validShrines.length} Shrines & Temples</span>
          </button>
          {validCustomLocations.length > 0 && (
            <button
              onClick={() => setShowCustomLocations(!showCustomLocations)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${
                showCustomLocations 
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
              title={showCustomLocations ? 'Hide custom locations' : 'Show custom locations'}
            >
              <div className={`w-3 h-3 rounded-full ${showCustomLocations ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
              <span>{validCustomLocations.length} Custom</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Map container */}
      <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
        <MapContainer
          center={FUKUI_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          className="leaflet-container"
        >
          <TileLayer
            url={currentStyle.url}
            attribution={currentStyle.attribution}
          />
          
          {/* 地圖點擊事件處理 */}
          <MapClickHandler isEditMode={isEditMode} onMapClick={handleMapClick} />

          {/* User location marker */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userLocationIcon}
            >
              <Popup>
                <div className="max-w-xs">
                  <h3 className="font-bold text-lg mb-2 text-green-600 flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    Your Location
                  </h3>
                  <p className="text-sm text-gray-600">
                    Coordinates: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                  </p>
                  <div className="mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    Current Location
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Attraction location markers - 藍色圖標 */}
          {showAttractions && validLocations.map((location) => (
            <Marker
              key={location.id}
              position={[location.coordinates!.lat, location.coordinates!.lng]}
              icon={attractionLocationIcon}
            >
              <Popup>
                <div className="max-w-xs">
                  <h3 className="font-bold text-lg mb-2 text-blue-800 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    {location.title}
                  </h3>
                  
                  {(() => {
                    const details = formatLocationDetails(location);
                    return (
                      <div className="space-y-2">
                        {details.rating && (
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-yellow-500">⭐</span>
                            <span className="font-medium">{details.rating}/5.0</span>
                            {details.reviews && <span className="text-gray-500">({details.reviews})</span>}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            Attraction
                          </span>
                        </div>
                        
                        {details.address && (
                          <div className="text-xs text-gray-500 flex items-start gap-1">
                            <span>📍</span>
                            <span className="line-clamp-2">{details.address}</span>
                          </div>
                        )}

                        {details.phone && details.phone !== '-' && details.phone !== '未提供' && (
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <span>📞</span>
                            <span>{details.phone}</span>
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-3">
                          <button
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
                            onClick={async () => {
                              const googleMapsUrl = await createGoogleMapsUrl({
                                lat: location.coordinates!.lat,
                                lng: location.coordinates!.lng
                              });
                              window.open(googleMapsUrl, '_blank');
                            }}
                          >
                            <Navigation className="w-3 h-3 mr-1 inline" />
                            Navigate
                          </button>
                          
                          <button
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
                            onClick={async () => {
                              setSelectedLocation(location);
                              // 嘗試載入預覽圖
                              const imagePath = await getAttractionImage(location.title);
                              setPreviewImage(imagePath);
                            }}
                          >
                            <Info className="w-3 h-3 mr-1 inline" />
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Shrine location markers - 紅色圖標 */}
          {showShrines && validShrines.map((shrine) => (
            <Marker
              key={shrine.id}
              position={[shrine.coordinates!.lat, shrine.coordinates!.lng]}
              icon={shrineLocationIcon}
            >
              <Popup>
                <div className="max-w-xs">
                  <h3 className="font-bold text-lg mb-2 text-red-800 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    {shrine.title}
                  </h3>
                  
                  {(() => {
                    const details = formatLocationDetails(shrine);
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                            {details.type}
                          </span>
                        </div>
                        
                        {details.address && (
                          <div className="text-xs text-gray-500 flex items-start gap-1">
                            <span>📍</span>
                            <span className="line-clamp-2">{details.address}</span>
                          </div>
                        )}

                        {details.phone && details.phone !== '-' && details.phone !== '未提供' && (
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <span>📞</span>
                            <span>{details.phone}</span>
                          </div>
                        )}

                        {details.openingHours && (
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <span>🕐</span>
                            <span>{details.openingHours}</span>
                          </div>
                        )}

                        {details.admissionFee && (
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <span>💴</span>
                            <span>{details.admissionFee}</span>
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-3">
                          <button
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
                            onClick={async () => {
                              const googleMapsUrl = await createGoogleMapsUrl({
                                lat: shrine.coordinates!.lat,
                                lng: shrine.coordinates!.lng
                              });
                              window.open(googleMapsUrl, '_blank');
                            }}
                          >
                            <Navigation className="w-3 h-3 mr-1 inline" />
                            Navigate
                          </button>
                          
                          <button
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
                            onClick={async () => {
                              setSelectedLocation(shrine);
                              // 嘗試載入預覽圖
                              const imagePath = await getAttractionImage(shrine.title);
                              setPreviewImage(imagePath);
                            }}
                          >
                            <Info className="w-3 h-3 mr-1 inline" />
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Custom location markers - 黃色圖標 */}
          {showCustomLocations && validCustomLocations.map((location) => (
            <Marker
              key={location.id}
              position={[location.coordinates!.lat, location.coordinates!.lng]}
              icon={customLocationIcon}
            >
              <Popup>
                <div className="max-w-xs">
                  <h3 className="font-bold text-lg mb-2 text-yellow-800 flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    {location.title}
                  </h3>
                  
                  {(() => {
                    const details = formatLocationDetails(location);
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                            {details.type} (自定義)
                          </span>
                        </div>
                        
                        {details.address && (
                          <div className="text-xs text-gray-500 flex items-start gap-1">
                            <span>📍</span>
                            <span className="line-clamp-2">{details.address}</span>
                          </div>
                        )}

                        {details.phone && details.phone !== '-' && details.phone !== '未提供' && (
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <span>📞</span>
                            <span>{details.phone}</span>
                          </div>
                        )}

                        {details.openingHours && (
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <span>🕐</span>
                            <span>{details.openingHours}</span>
                          </div>
                        )}

                        {details.admissionFee && (
                          <div className="text-xs text-gray-600 flex items-center gap-1">
                            <span>💴</span>
                            <span>{details.admissionFee}</span>
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-3">
                          <button
                            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
                            onClick={async () => {
                              const googleMapsUrl = await createGoogleMapsUrl({
                                lat: location.coordinates!.lat,
                                lng: location.coordinates!.lng
                              });
                              window.open(googleMapsUrl, '_blank');
                            }}
                          >
                            <Navigation className="w-3 h-3 mr-1 inline" />
                            Navigate
                          </button>
                          
                          <button
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
                            onClick={async () => {
                              setSelectedLocation(location);
                              // Custom locations don't need to load preview images
                              setPreviewImage(null);
                            }}
                          >
                            <Info className="w-3 h-3 mr-1 inline" />
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Detailed information sidebar */}
      {selectedLocation && (
        <motion.div
          className="absolute top-0 right-0 w-96 h-full bg-white shadow-xl z-[1001] overflow-y-auto"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        >
          <div className="p-6">
            {/* Close button */}
            <button
              onClick={() => {
                setSelectedLocation(null);
                setPreviewImage(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>

            {/* Location information */}
            <div className="mt-4">
              <h2 className="text-xl font-bold mb-4 pr-8 text-gray-800">
                {selectedLocation.title}
              </h2>

              {/* Preview Image */}
              {previewImage && (
                <div className="mb-4">
                  <img 
                    src={previewImage} 
                    alt={selectedLocation.title}
                    className="w-full h-48 object-cover rounded-lg shadow-md"
                    onError={() => setPreviewImage(null)}
                  />
                </div>
              )}

              {(() => {
                const details = formatLocationDetails(selectedLocation);
                return (
                  <div className="space-y-4">
                    {/* Description */}
                    {selectedLocation.content && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-bold mb-2 text-gray-800">📋 Description</h3>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-6">
                          {selectedLocation.content}
                        </p>
                      </div>
                    )}

                    {/* Rating */}
                    {details.rating && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <h3 className="text-md font-bold mb-1 text-yellow-800">⭐ Rating</h3>
                        <p className="text-yellow-700 text-sm">
                          {details.rating}/5.0 {details.reviews && `(${details.reviews} reviews)`}
                        </p>
                      </div>
                    )}

                    {/* Contact Information */}
                    <div className="space-y-2">
                      {details.phone && details.phone !== '-' && details.phone !== '未提供' && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h3 className="text-md font-bold mb-1 text-blue-800">📞 Phone</h3>
                          <p className="text-blue-700 text-sm">{details.phone}</p>
                        </div>
                      )}

                      {details.website && (
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <h3 className="text-md font-bold mb-1 text-purple-800">🌐 Website</h3>
                          <a 
                            href={details.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-700 text-sm hover:underline break-all"
                          >
                            {details.website}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    {details.address && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h3 className="text-md font-bold mb-1 text-green-800">📍 Address</h3>
                        <p className="text-green-700 text-sm leading-relaxed">
                          {details.address}
                        </p>
                      </div>
                    )}

                    {/* Coordinates */}
                    {details.coordinates && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h3 className="text-md font-bold mb-1 text-gray-800">🗺️ Coordinates</h3>
                        <p className="text-gray-700 text-sm font-mono">
                          {details.coordinates.lat.toFixed(6)}, {details.coordinates.lng.toFixed(6)}
                        </p>
                      </div>
                    )}

                    {/* Additional Information */}
                    <div className="space-y-2">
                      {details.type && (
                        <div className="bg-indigo-50 p-3 rounded-lg">
                          <h3 className="text-md font-bold mb-1 text-indigo-800">🏛️ Type</h3>
                          <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                            {details.type}
                          </span>
                        </div>
                      )}

                      {details.openingHours && (
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <h3 className="text-md font-bold mb-1 text-orange-800">🕐 Opening Hours</h3>
                          <p className="text-orange-700 text-sm">{details.openingHours}</p>
                        </div>
                      )}

                      {details.admissionFee && (
                        <div className="bg-pink-50 p-3 rounded-lg">
                          <h3 className="text-md font-bold mb-1 text-pink-800">💰 Admission Fee</h3>
                          <p className="text-pink-700 text-sm">{details.admissionFee}</p>
                        </div>
                      )}

                      {details.founded_year && details.founded_year !== '不明' && (
                        <div className="bg-amber-50 p-3 rounded-lg">
                          <h3 className="text-md font-bold mb-1 text-amber-800">📅 Founded</h3>
                          <p className="text-amber-700 text-sm">{details.founded_year}</p>
                        </div>
                      )}
                    </div>

                    {/* Enshrined Deities */}
                    {details.enshrined_deities.length > 0 && (
                      <div className="bg-violet-50 p-3 rounded-lg">
                        <h3 className="text-md font-bold mb-2 text-violet-800">⛩️ Enshrined Deities</h3>
                        <div className="space-y-1">
                          {details.enshrined_deities.map((deity: any, index: number) => (
                            <div key={index} className="text-violet-700 text-sm">
                              <span className="font-medium">{deity.name}</span>
                              {deity.role && <span className="text-violet-600"> - {deity.role}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Facilities */}
                    <div className="bg-teal-50 p-3 rounded-lg">
                      <h3 className="text-md font-bold mb-2 text-teal-800">🏢 Facilities</h3>
                      <div className="flex flex-wrap gap-2">
                        {details.wheelchair_access && (
                          <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">
                            ♿ Wheelchair Access
                          </span>
                        )}
                        {details.wifi && (
                          <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">
                            📶 WiFi
                          </span>
                        )}
                        {details.toilets && (
                          <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">
                            🚻 Toilets
                          </span>
                        )}
                        {!details.wheelchair_access && !details.wifi && !details.toilets && (
                          <span className="text-teal-600 text-xs">Information not provided</span>
                        )}
                      </div>
                    </div>

                    {/* QR Code */}
                    <QRCodeDisplay location={selectedLocation} />
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div className="space-y-2 mt-6">
                <button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  onClick={async () => {
                    const googleMapsUrl = await createGoogleMapsUrl({
                      lat: selectedLocation.coordinates!.lat,
                      lng: selectedLocation.coordinates!.lng
                    });
                    window.open(googleMapsUrl, '_blank');
                  }}
                >
                  <Navigation className="w-4 h-4" />
                  Google Maps Navigation
                </button>

                <button
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  onClick={() => {
                    // Copy coordinates to clipboard
                    navigator.clipboard.writeText(`${selectedLocation.coordinates!.lat},${selectedLocation.coordinates!.lng}`);
                    alert('Coordinates copied to clipboard!');
                  }}
                >
                  <MapPin className="w-4 h-4" />
                  Copy Coordinates
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading indicator */}
      {validLocations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-[1000]">
          <div className="text-center">
            <motion.div
              className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-gray-600">Loading map data...</p>
          </div>
        </div>
      )}

      {/* EditLocationForm */}
      <AnimatePresence>
        {isFormOpen && (
          <EditLocationForm
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setClickedCoordinates(null);
            }}
            onSave={handleAddLocation}
            initialCoordinates={clickedCoordinates || undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MapView;
