import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Info, Navigation, Layers, UserCheck } from 'lucide-react';
import { LocationData } from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 建立用戶位置標記圖示 - 使用更顯眼的圖示
const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [35, 55], // 比預設標記更大
  iconAnchor: [17, 55],
  popupAnchor: [1, -34],
  shadowSize: [55, 55]
});

// 建立神社標記圖示 - 使用紅色以區別於用戶位置
const shrineLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapViewProps {
  locations: LocationData[];
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

const MapView: React.FC<MapViewProps> = ({ locations }) => {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [currentMapStyle, setCurrentMapStyle] = useState(0);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // 格式化詳細資訊的輔助函式
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

  // 獲取用戶位置
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

  // 建立 Google Maps 導航 URL
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

      // 建立 Google Maps URL
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

  const currentStyle = MAP_STYLES[currentMapStyle];

  // 初始時嘗試獲取用戶位置
  useEffect(() => {
    getUserLocation().catch(() => {
      console.log('無法獲取用戶位置，將僅顯示景點');
    });
  }, []);

  const cycleMapStyle = () => {
    setCurrentMapStyle((prev) => (prev + 1) % MAP_STYLES.length);
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
          title="獲取我的位置"
        >
          <UserCheck className="w-4 h-4" />
          {userLocation ? '位置已獲取' : '獲取我的位置'}
        </button>
      </motion.div>
      <motion.div 
        className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg px-4 py-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>{validLocations.length} attractions</span>
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
                    您的位置
                  </h3>
                  <p className="text-sm text-gray-600">
                    座標: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                  </p>
                  <div className="mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    目前位置
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Location markers */}
          {validLocations.map((location) => (
            <Marker
              key={location.id}
              position={[location.coordinates!.lat, location.coordinates!.lng]}
              icon={shrineLocationIcon}
            >
              <Popup>
                <div className="max-w-xs">
                  <h3 className="font-bold text-lg mb-2 text-gray-800">
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
                        
                        {details.type && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {details.type}
                            </span>
                          </div>
                        )}
                        
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
                            onClick={() => setSelectedLocation(location)}
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
              onClick={() => setSelectedLocation(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>

            {/* Location information */}
            <div className="mt-4">
              <h2 className="text-xl font-bold mb-4 pr-8 text-gray-800">
                {selectedLocation.title}
              </h2>

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
                          <span className="text-teal-600 text-xs">資訊未提供</span>
                        )}
                      </div>
                    </div>
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
    </div>
  );
};

export default MapView;
