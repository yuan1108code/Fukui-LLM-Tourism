import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Mountain, Utensils, Train, MapPin, Calendar, Camera, Route, ChevronDown, ChevronUp, Navigation } from 'lucide-react';

interface QuickActionsProps {
  onQuickAction: (action: string, customText?: string) => void;
  onLocationUpdate?: (location: UserLocation | null) => void;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onQuickAction, onLocationUpdate }) => {
  const [selectedCity, setSelectedCity] = useState<{japanese: string, english: string} | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');

  // Major cities and towns in Fukui Prefecture (mapping Japanese names to English for display and questions)
  const fukuiCities = [
    { japanese: '福井市', english: 'Fukui City' },
    { japanese: '敦賀市', english: 'Tsuruga City' },
    { japanese: '小浜市', english: 'Obama City' },
    { japanese: '大野市', english: 'Ono City' },
    { japanese: '勝山市', english: 'Katsuyama City' },
    { japanese: '鯖江市', english: 'Sabae City' },
    { japanese: 'あわら市', english: 'Awara City' },
    { japanese: '越前市', english: 'Echizen City' },
    { japanese: '坂井市', english: 'Sakai City' },
    { japanese: '永平寺町', english: 'Eiheiji Town' },
    { japanese: '池田町', english: 'Ikeda Town' },
    { japanese: '南越前町', english: 'Minamiechizen Town' },
    { japanese: '越前町', english: 'Echizen Town' },
    { japanese: '美浜町', english: 'Mihama Town' },
    { japanese: '高浜町', english: 'Takahama Town' },
    { japanese: '若狭町', english: 'Wakasa Town' },
    { japanese: '大飯町', english: 'Ohi Town' }
  ];

  // Get current time and season information
  const getCurrentTimeInfo = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // 判斷季節
    let season = '';
    if (month >= 3 && month <= 5) season = 'spring (春季)';
    else if (month >= 6 && month <= 8) season = 'summer (夏季)';
    else if (month >= 9 && month <= 11) season = 'autumn (秋季)';
    else season = 'winter (冬季)';
    
    return {
      currentTime: `${year}年${month}月${date}日 ${hour}:${minute.toString().padStart(2, '0')}`,
      season,
      month,
      hour
    };
  };

  // Get user location
  useEffect(() => {
    const requestLocation = async () => {
      if (!navigator.geolocation) {
        setLocationPermission('denied');
        return;
      }

      try {
        // 先檢查權限狀態
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (permission.state === 'denied') {
            setLocationPermission('denied');
            return;
          }
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
            setUserLocation(location);
            setLocationPermission('granted');
            
            // 通知父組件位置更新
            if (onLocationUpdate) {
              onLocationUpdate(location);
            }
          },
          (error) => {
            console.log('位置獲取失敗:', error.message);
            setLocationPermission('denied');
            
            // 通知父組件位置獲取失敗
            if (onLocationUpdate) {
              onLocationUpdate(null);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5分鐘快取
          }
        );
      } catch (error) {
        console.log('位置服務不可用:', error);
        setLocationPermission('denied');
      }
    };

    requestLocation();
  }, []);

  const baseActions = [
    {
      id: 'shrines',
      icon: Building2,
      label: 'Shrine Visits',
      color: 'from-red-500 to-pink-500',
      description: 'Explore Fukui shrines',
      hasLocationOption: true
    },
    {
      id: 'attractions',
      icon: Mountain,
      label: 'Attractions',
      color: 'from-blue-500 to-cyan-500',
      description: 'Discover beautiful spots',
      hasLocationOption: true
    },
    {
      id: 'food',
      icon: Utensils,
      label: 'Local Cuisine',
      color: 'from-green-500 to-emerald-500',
      description: 'Taste specialty dishes',
      hasLocationOption: true
    },
    {
      id: 'transportation',
      icon: Train,
      label: 'Transportation',
      color: 'from-purple-500 to-indigo-500',
      description: 'Plan travel routes',
      hasLocationOption: true
    }
  ];

  const extraActions = [
    {
      id: 'seasonal',
      icon: Calendar,
      label: 'Seasonal Events',
      color: 'from-orange-500 to-amber-500',
      description: 'Current seasonal activities',
      hasLocationOption: true
    },
    {
      id: 'photography',
      icon: Camera,
      label: 'Photo Spots',
      color: 'from-indigo-500 to-purple-500',
      description: 'Perfect photography locations',
      hasLocationOption: true
    },
    {
      id: 'routes',
      icon: Route,
      label: 'Day Trip Routes',
      color: 'from-teal-500 to-cyan-500',
      description: 'Curated travel itineraries',
      hasLocationOption: true
    },
    {
      id: 'cultural',
      icon: MapPin,
      label: 'Cultural Experiences',
      color: 'from-rose-500 to-pink-500',
      description: 'Traditional cultural activities',
      hasLocationOption: true
    }
  ];

  const handleActionClick = (actionId: string, hasLocationOption: boolean) => {
    const timeInfo = getCurrentTimeInfo();
    
    const baseQuestions: Record<string, string> = {
      shrines: 'Please recommend famous shrines in Fukui Prefecture',
      attractions: 'What are the must-visit tourist attractions in Fukui Prefecture?',
      food: 'What are the specialty foods in Fukui Prefecture?',
      transportation: 'How can I get to Fukui Prefecture? What transportation options are available?',
      seasonal: `What seasonal events or festivals are currently happening in Fukui Prefecture during ${timeInfo.season}?`,
      photography: 'What are the best photography spots in Fukui Prefecture?',
      routes: 'Please recommend day trip or multi-day itineraries for Fukui Prefecture',
      cultural: 'What traditional cultural experiences are available in Fukui Prefecture?'
    };

    let question = baseQuestions[actionId];
    
    // Add time information (especially seasonal activities)
    if (actionId === 'seasonal') {
      question = `Please recommend current seasonal events, festivals, or activities in Fukui Prefecture. Current time: ${timeInfo.currentTime}, Season: ${timeInfo.season}. Please focus on events that are typically available during this time of year.`;
    }
    
    // Add location information
    if (hasLocationOption && selectedCity) {
      // Replace "Fukui Prefecture" with the selected city's English name
      question = question.replace('Fukui Prefecture', selectedCity.english);
    }
    
    // If user location information is available, add geographical location
    if (userLocation && locationPermission === 'granted') {
      const locationText = `\n\nAdditional context: User's current location is approximately ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)} (accuracy: ${userLocation.accuracy}m). Please consider recommending nearby attractions if the user is currently in or near Fukui Prefecture.`;
      question += locationText;
    }
    
    // 為交通路線添加特殊處理
    if (actionId === 'transportation' && userLocation && locationPermission === 'granted') {
      question = `How can I get to ${selectedCity?.english || 'Fukui Prefecture'} from my current location? My current coordinates are approximately ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}. Please provide detailed transportation options including trains, buses, and driving directions. Current time: ${timeInfo.currentTime}.`;
    }

    onQuickAction(actionId, question);
  };

  const toggleCityDropdown = () => {
    setShowCityDropdown(!showCityDropdown);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="bg-white/50 backdrop-blur-sm border-b border-gray-100">
              {/* Title row - includes collapse button */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-600 font-medium">Quick Explore:</p>
            <motion.button
              onClick={toggleCollapse}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </motion.button>
            
            {/* 位置狀態指示器 */}
            {locationPermission === 'granted' && userLocation && (
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <Navigation className="w-3 h-3" />
                <span>Location detected</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 時間顯示 */}
            <div className="text-xs text-gray-500">
              {getCurrentTimeInfo().currentTime} ({getCurrentTimeInfo().season})
            </div>
            
            {/* 城市選擇器 */}
            <div className="relative">
              <motion.button
                onClick={toggleCityDropdown}
                className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <MapPin className="w-3 h-3" />
                <span>{selectedCity?.english || 'Select City'}</span>
              </motion.button>

              <AnimatePresence>
                {showCityDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                    style={{ minWidth: '120px' }}
                  >
                    <button
                      onClick={() => {
                        setSelectedCity(null);
                        setShowCityDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100"
                    >
                      All Fukui Prefecture
                    </button>
                    {fukuiCities.map((city) => (
                      <button
                        key={city.japanese}
                        onClick={() => {
                          setSelectedCity(city);
                          setShowCityDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                      >
                        {city.english}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* 可收合的內容區域 */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {/* 基本功能按鈕 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {baseActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    onClick={() => handleActionClick(action.id, action.hasLocationOption)}
                    className="group relative overflow-hidden rounded-xl p-3 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    {/* 背景漸層 */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-200`} />
                    
                    {/* 圖示 */}
                    <div className={`w-8 h-8 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-2`}>
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    
                    {/* 文字 */}
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800 mb-1">
                        {action.label}
                      </p>
                      <p className="text-xs text-gray-500 leading-tight">
                        {action.description}
                      </p>
                    </div>
                    
                    {/* 位置指示器 */}
                    {action.hasLocationOption && selectedCity && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* 額外功能按鈕 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {extraActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    onClick={() => handleActionClick(action.id, action.hasLocationOption)}
                    className="group relative overflow-hidden rounded-xl p-3 bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: (index + baseActions.length) * 0.1 }}
                  >
                    {/* 背景漸層 */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-200`} />
                    
                    {/* 圖示 */}
                    <div className={`w-8 h-8 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-2`}>
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    
                    {/* 文字 */}
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800 mb-1">
                        {action.label}
                      </p>
                      <p className="text-xs text-gray-500 leading-tight">
                        {action.description}
                      </p>
                    </div>
                    
                    {/* 位置指示器 */}
                    {action.hasLocationOption && selectedCity && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickActions;
