import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Upload, 
  X, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  MapPin,
  Camera,
  BookOpen,
  Sparkles,
  Copy,
  Download,
  Calendar,
  ChevronDown,
  Heart,
  Clock
} from 'lucide-react';
import { LocationData } from '../services/api';
import { apiService } from '../services/api';

interface TravelSpot {
  id: string;
  name: string;
  city: string;
  coordinates: { latitude: number; longitude: number };
  photos: File[];
  description: string;
  order: number;
  date: string; // Add date field for each spot
}

interface StoryModeRealProps {
  availableLocations: LocationData[];
  availableShrines: LocationData[];
}

const StoryModeReal: React.FC<StoryModeRealProps> = ({ 
  availableLocations, 
  availableShrines 
}) => {
  const [travelSpots, setTravelSpots] = useState<TravelSpot[]>([]);
  const [travelDateRange, setTravelDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<string>('');
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [editingSpot, setEditingSpot] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Merge all available location data
  const allLocations = [...availableLocations, ...availableShrines];

  // Filter searchable locations
  const filteredLocations = allLocations.filter(location => 
    location.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.metadata.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Generate date range for travel
  const generateDateRange = () => {
    if (!travelDateRange.start || !travelDateRange.end) return [];
    
    const start = new Date(travelDateRange.start);
    const end = new Date(travelDateRange.end);
    const dates: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const dateRange = generateDateRange();



  // Select location and add to itinerary
  const selectLocation = (location: LocationData) => {
    const newSpot: TravelSpot = {
      id: `spot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: location.title,
      city: location.metadata.city || 'Fukui Prefecture',
      coordinates: {
        latitude: location.coordinates?.lat || 0,
        longitude: location.coordinates?.lng || 0
      },
      photos: [],
      description: '',
      order: travelSpots.length,
      date: selectedDate
    };

    setTravelSpots(prev => [...prev, newSpot]);
    setShowLocationSelector(false);
    setSearchTerm('');
  };

  // Remove travel spot
  const removeTravelSpot = (id: string) => {
    setTravelSpots(prev => {
      const updated = prev.filter(spot => spot.id !== id);
      // Reorder
      return updated.map((spot, index) => ({ ...spot, order: index }));
    });
  };

  // Upload photos
  const uploadPhotos = (spotId: string, files: FileList | null) => {
    if (!files) return;

    const photoArray = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    setTravelSpots(prev => prev.map(spot => 
      spot.id === spotId
        ? { ...spot, photos: [...spot.photos, ...photoArray] }
        : spot
    ));
  };

  // Remove photo
  const removePhoto = (spotId: string, photoIndex: number) => {
    setTravelSpots(prev => prev.map(spot => 
      spot.id === spotId
        ? { ...spot, photos: spot.photos.filter((_, index) => index !== photoIndex) }
        : spot
    ));
  };

  // Update description
  const updateDescription = (spotId: string, description: string) => {
    setTravelSpots(prev => prev.map(spot => 
      spot.id === spotId ? { ...spot, description } : spot
    ));
  };

  // Update spot date
  const updateSpotDate = (spotId: string, date: string) => {
    setTravelSpots(prev => prev.map(spot => 
      spot.id === spotId ? { ...spot, date } : spot
    ));
  };

  // Adjust spot order
  const moveSpot = (id: string, direction: 'up' | 'down') => {
    setTravelSpots(prev => {
      const currentIndex = prev.findIndex(spot => spot.id === id);
      if (currentIndex === -1) return prev;

      const newIndex = direction === 'up' 
        ? Math.max(0, currentIndex - 1)
        : Math.min(prev.length - 1, currentIndex + 1);

      if (newIndex === currentIndex) return prev;

      const newSpots = [...prev];
      [newSpots[currentIndex], newSpots[newIndex]] = [newSpots[newIndex], newSpots[currentIndex]];

      // Update order
      return newSpots.map((spot, index) => ({ ...spot, order: index }));
    });
  };

  // Group spots by date
  const spotsByDate = travelSpots.reduce((acc, spot) => {
    if (!acc[spot.date]) {
      acc[spot.date] = [];
    }
    acc[spot.date].push(spot);
    return acc;
  }, {} as Record<string, TravelSpot[]>);

  // Generate story book
  const generateStoryBook = async () => {
    if (travelSpots.length === 0) {
      alert('Please add at least one location to generate a story book!');
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      
      // Prepare location data
      const locationsData = travelSpots.map(spot => ({
        id: spot.id,
        name: spot.name,
        city: spot.city,
        coordinates: {
          latitude: spot.coordinates.latitude,
          longitude: spot.coordinates.longitude
        },
        description: spot.description,
        date: spot.date
      }));

      formData.append('locations', JSON.stringify(locationsData));
      formData.append('travel_date_range', JSON.stringify(travelDateRange));

      // Add all photos
      travelSpots.forEach((spot, spotIndex) => {
        spot.photos.forEach((photo, photoIndex) => {
          formData.append('images', photo, `${spot.name}_${photoIndex}.${photo.name.split('.').pop()}`);
        });
      });

      const response = await apiService.generateStory(formData);
      setGeneratedStory(response.story);
    } catch (error: any) {
      console.error('Failed to generate story book:', error);
      
      // 顯示更具體的錯誤信息
      let errorMessage = 'An error occurred while generating the story book. Please try again later.';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // 使用更友好的錯誤通知
      const errorNotification = document.createElement('div');
      errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md';
      errorNotification.innerHTML = `
        <div class="flex items-start space-x-2">
          <span class="text-lg">❌</span>
          <div>
            <div class="font-medium">Story Generation Failed</div>
            <div class="text-sm opacity-90">${errorMessage}</div>
          </div>
        </div>
      `;
      document.body.appendChild(errorNotification);
      
      // 5秒後自動移除通知
      setTimeout(() => {
        errorNotification.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(errorNotification), 300);
      }, 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy story to clipboard
  const copyStoryToClipboard = () => {
    // 為社群媒體優化的格式
    const socialMediaText = `🌟 My Fukui Travel Adventure 🌟\n\n${generatedStory}\n\n#FukuiTravel #JapanTravel #TravelStory #福井旅行`;
    
    navigator.clipboard.writeText(socialMediaText)
      .then(() => {
        // 使用更友好的通知
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
        notification.innerHTML = `
          <div class="flex items-center space-x-2">
            <span>✅</span>
            <span>Story copied to clipboard! Ready for social media sharing.</span>
          </div>
        `;
        document.body.appendChild(notification);
        
        // 3秒後自動移除通知
        setTimeout(() => {
          notification.style.transform = 'translateX(100%)';
          setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
      })
      .catch(() => {
        const errorNotification = document.createElement('div');
        errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        errorNotification.innerHTML = `
          <div class="flex items-center space-x-2">
            <span>❌</span>
            <span>Copy failed. Please try again.</span>
          </div>
        `;
        document.body.appendChild(errorNotification);
        
        setTimeout(() => {
          errorNotification.style.transform = 'translateX(100%)';
          setTimeout(() => document.body.removeChild(errorNotification), 300);
        }, 3000);
      });
  };

  // Download story
  const downloadStory = () => {
    const blob = new Blob([generatedStory], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fukui_Travel_Story_${travelDateRange.start || new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full bg-gradient-to-br from-purple-50 to-pink-50 p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        {/* Title */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-purple-200"
          >
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-purple-800">Fukui Travel Story Book Generator</h1>
            <Sparkles className="w-6 h-6 text-purple-600" />
          </motion.div>
          <p className="mt-4 text-gray-600">Create your unique Fukui travel memories</p>
        </div>

        {/* Travel date range setting */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-purple-600" />
            Travel Date Range
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={travelDateRange.start}
                onChange={(e) => setTravelDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={travelDateRange.end}
                onChange={(e) => setTravelDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          {dateRange.length > 0 && (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">
                <Clock className="w-4 h-4 inline mr-1" />
                Travel duration: {dateRange.length} day{dateRange.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </motion.div>

        {/* Location management area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-purple-600" />
              Travel Itinerary ({travelSpots.length} locations)
            </h2>
          </div>

          {/* Location list grouped by date */}
          <div className="space-y-6">
            {dateRange.length > 0 ? (
              dateRange.map((date) => {
                const spotsForDate = spotsByDate[date] || [];
                return (
                  <div key={date} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-md font-semibold text-gray-700 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                        <span className="ml-2 text-sm text-gray-500">({spotsForDate.length} locations)</span>
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedDate(date);
                          setShowLocationSelector(true);
                        }}
                        className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Location</span>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <AnimatePresence>
                        {spotsForDate.map((spot, index) => (
                          <motion.div
                            key={spot.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="bg-purple-100 text-purple-800 text-sm font-medium px-2 py-1 rounded">
                                    Day {dateRange.indexOf(date) + 1} - {index + 1}
                                  </span>
                                  <h3 className="font-semibold text-gray-800">{spot.name}</h3>
                                  <span className="text-sm text-gray-500">({spot.city})</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {/* Order adjustment buttons */}
                                <button
                                  onClick={() => moveSpot(spot.id, 'up')}
                                  disabled={index === 0}
                                  className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move up"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => moveSpot(spot.id, 'down')}
                                  disabled={index === spotsForDate.length - 1}
                                  className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move down"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                
                                {/* Edit button */}
                                <button
                                  onClick={() => setEditingSpot(editingSpot === spot.id ? null : spot.id)}
                                  className="p-1 text-gray-500 hover:text-purple-600"
                                  title="Edit"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                
                                {/* Delete button */}
                                <button
                                  onClick={() => removeTravelSpot(spot.id)}
                                  className="p-1 text-gray-500 hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded edit area */}
                            <AnimatePresence>
                              {editingSpot === spot.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-gray-200 pt-4 mt-4"
                                >
                                  {/* Date selector */}
                                  <div className="mb-4">
                                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                      <Calendar className="w-4 h-4 mr-1" />
                                      Visit Date
                                    </label>
                                    <select
                                      value={spot.date}
                                      onChange={(e) => updateSpotDate(spot.id, e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                      {dateRange.map((date) => (
                                        <option key={date} value={date}>
                                          {new Date(date).toLocaleDateString('en-US', { 
                                            weekday: 'short', 
                                            month: 'short', 
                                            day: 'numeric' 
                                          })}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Photo upload area */}
                                  <div className="mb-4">
                                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                      <Camera className="w-4 h-4 mr-1" />
                                      Travel Photos
                                    </label>
                                    <div className="flex items-center space-x-4">
                                      <label className="cursor-pointer">
                                        <input
                                          type="file"
                                          multiple
                                          accept="image/*"
                                          onChange={(e) => uploadPhotos(spot.id, e.target.files)}
                                          className="hidden"
                                        />
                                        <div className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors">
                                          <Upload className="w-4 h-4" />
                                          <span>Upload Photos</span>
                                        </div>
                                      </label>
                                    </div>
                                    
                                    {/* Uploaded photo preview */}
                                    {spot.photos.length > 0 && (
                                      <div className="mt-3 grid grid-cols-4 gap-2">
                                        {spot.photos.map((photo, photoIndex) => (
                                          <div key={photoIndex} className="relative group">
                                            <img
                                              src={URL.createObjectURL(photo)}
                                              alt={`${spot.name} photo ${photoIndex + 1}`}
                                              className="w-full h-16 object-cover rounded border"
                                            />
                                            <button
                                              onClick={() => removePhoto(spot.id, photoIndex)}
                                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Description */}
                                  <div>
                                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                      <Heart className="w-4 h-4 mr-1" />
                                      Travel Experience
                                    </label>
                                    <textarea
                                      value={spot.description}
                                      onChange={(e) => updateDescription(spot.id, e.target.value)}
                                      placeholder="Share your feelings, emotions, and special memories about this location... (This will be included in your generated travel story!)"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                      rows={3}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      💡 Describe what you felt, what surprised you, or any special moments you experienced here.
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      {spotsForDate.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          <MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p>No locations added for this day</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No locations added yet</p>
                <p className="text-sm">Set travel date range and click "Add Location" to start planning your journey</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Generate story book button */}
        {travelSpots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="mb-4 text-sm text-gray-600">
              <p>✨ Your photos and travel experiences will be included in the story!</p>
              <p>📝 Perfect for sharing on social media platforms</p>
            </div>
            <button
              onClick={generateStoryBook}
              disabled={isGenerating}
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-6 h-6" />
                  </motion.div>
                  <span>Generating story book...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-6 h-6" />
                  <span>Generate My Story Book</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Generated story */}
        {generatedStory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
                Your Fukui Travel Story Book
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={copyStoryToClipboard}
                  className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={downloadStory}
                  className="flex items-center space-x-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </div>
            
            <div className="prose prose-lg max-w-none">
              <div className="bg-gray-50 rounded-lg p-6 whitespace-pre-wrap text-gray-800 leading-relaxed">
                {generatedStory}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Location selection modal */}
      <AnimatePresence>
        {showLocationSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Select Location</h3>
                  <button
                    onClick={() => setShowLocationSelector(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <input
                  type="text"
                  placeholder="Search location name or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {filteredLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => selectLocation(location)}
                      className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      <div className="font-medium text-gray-800 mb-1">{location.title}</div>
                      <div className="text-sm text-gray-500">
                        {location.metadata.city} • {location.metadata.source_type}
                      </div>
                      <div className="text-xs text-purple-600 mt-2">
                        Click to add to {selectedDate ? `Day ${dateRange.indexOf(selectedDate) + 1}` : 'selected day'}
                      </div>
                    </button>
                  ))}
                  
                  {filteredLocations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No matching locations found</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoryModeReal;
