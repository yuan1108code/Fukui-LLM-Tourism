import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Info, Navigation, Layers } from 'lucide-react';
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

  const handleMarkerClick = (location: LocationData) => {
    setSelectedLocation(location);
  };

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

      {/* Map info panel */}
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

          {/* Location markers */}
          {validLocations.map((location) => (
            <Marker
              key={location.id}
              position={[location.coordinates!.lat, location.coordinates!.lng]}
              eventHandlers={{
                click: () => handleMarkerClick(location)
              }}
            >
              <Popup>
                <div className="max-w-xs">
                  <h3 className="font-bold text-lg mb-2 text-gray-800">
                    {location.title}
                  </h3>
                  
                  {location.content && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {location.content}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    {location.metadata?.category && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          {location.metadata.category}
                        </span>
                      </div>
                    )}
                    
                    {location.metadata?.address && (
                      <div className="text-xs text-gray-500">
                        📍 {location.metadata.address}
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-3">
                      <button
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
                        onClick={() => {
                          // Open Google Maps navigation
                          const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=\${location.coordinates!.lat},\${location.coordinates!.lng}`;
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
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Detailed information sidebar */}
      {selectedLocation && (
        <motion.div
          className="absolute top-0 right-0 w-80 h-full bg-white shadow-xl z-[1001] overflow-y-auto"
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
              <h2 className="text-xl font-bold mb-4 pr-8">
                {selectedLocation.title}
              </h2>

              {selectedLocation.metadata?.category && (
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {selectedLocation.metadata.category}
                  </span>
                </div>
              )}

              {selectedLocation.content && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {selectedLocation.content}
                  </p>
                </div>
              )}

              {selectedLocation.metadata?.address && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Address</h3>
                  <p className="text-gray-600 text-sm">
                    {selectedLocation.metadata.address}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Coordinates</h3>
                <p className="text-gray-600 text-sm">
                  {selectedLocation.coordinates!.lat.toFixed(6)}, {selectedLocation.coordinates!.lng.toFixed(6)}
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 mt-6">
                <button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  onClick={() => {
                    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=\${selectedLocation.coordinates!.lat},\${selectedLocation.coordinates!.lng}`;
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
                    navigator.clipboard.writeText(`\${selectedLocation.coordinates!.lat},\${selectedLocation.coordinates!.lng}`);
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
