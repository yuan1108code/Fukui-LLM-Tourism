import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, Copy, MapPin, Calendar, Camera, Sparkles, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { LocationData } from '../services/api';

interface StoryModeProps {
  locations: LocationData[];
  shrines: LocationData[];
}

interface SelectedLocation {
  id: string;
  name: string;
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  date?: string; // Add date field for each location
}

interface TravelDay {
  id: string;
  date: string;
  locations: SelectedLocation[];
}

interface StoryData {
  travelDays: TravelDay[];
  uploadedImages: File[];
  generatedStory: string;
  isGenerating: boolean;
}

const StoryMode: React.FC<StoryModeProps> = ({ locations, shrines }) => {
  const [storyData, setStoryData] = useState<StoryData>({
    travelDays: [],
    uploadedImages: [],
    generatedStory: '',
    isGenerating: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merge all location data
  const allLocations = React.useMemo(() => {
    const combined = [...locations, ...shrines];
    // Remove duplicates
    const uniqueLocations = combined.filter((location, index, self) => 
      index === self.findIndex(l => l.name === location.name)
    );
    return uniqueLocations;
  }, [locations, shrines]);

  const addTravelDay = useCallback(() => {
    const newDay: TravelDay = {
      id: `day-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: '',
      locations: []
    };
    setStoryData(prev => ({
      ...prev,
      travelDays: [...prev.travelDays, newDay]
    }));
  }, []);

  const removeTravelDay = useCallback((dayId: string) => {
    setStoryData(prev => ({
      ...prev,
      travelDays: prev.travelDays.filter(day => day.id !== dayId)
    }));
  }, []);

  const updateTravelDayDate = useCallback((dayId: string, date: string) => {
    setStoryData(prev => ({
      ...prev,
      travelDays: prev.travelDays.map(day => 
        day.id === dayId ? { ...day, date } : day
      )
    }));
  }, []);

  const handleLocationSelect = useCallback((dayId: string, event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = event.target.value;
    if (!selectedName) return;

    const location = allLocations.find(loc => loc.name === selectedName);
    if (!location) return;

    const newLocation: SelectedLocation = {
      id: `${location.name}-${Date.now()}`,
      name: location.name,
      city: location.city || 'Fukui Prefecture',
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
    };

    setStoryData(prev => ({
      ...prev,
      travelDays: prev.travelDays.map(day => 
        day.id === dayId 
          ? { ...day, locations: [...day.locations, newLocation] }
          : day
      )
    }));

    // Reset dropdown
    event.target.value = '';
  }, [allLocations]);

  const removeLocation = useCallback((dayId: string, locationId: string) => {
    setStoryData(prev => ({
      ...prev,
      travelDays: prev.travelDays.map(day => 
        day.id === dayId 
          ? { ...day, locations: day.locations.filter(loc => loc.id !== locationId) }
          : day
      )
    }));
  }, []);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    setStoryData(prev => ({
      ...prev,
      uploadedImages: [...prev.uploadedImages, ...imageFiles],
    }));
  }, []);

  const removeImage = useCallback((index: number) => {
    setStoryData(prev => ({
      ...prev,
      uploadedImages: prev.uploadedImages.filter((_, i) => i !== index),
    }));
  }, []);

  const generateStory = useCallback(async () => {
    const allSelectedLocations = storyData.travelDays.flatMap(day => day.locations);
    
    if (allSelectedLocations.length === 0) {
      alert('Please select at least one location!');
      return;
    }

    setStoryData(prev => ({ ...prev, isGenerating: true }));

    try {
      // Prepare data to send to backend
      const formData = new FormData();
      formData.append('travelDays', JSON.stringify(storyData.travelDays));
      
      // Add images
      storyData.uploadedImages.forEach((file, index) => {
        formData.append(`image_${index}`, file);
      });

      const response = await fetch('http://localhost:8001/api/generate-story', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate story');
      }

      const result = await response.json();
      
      setStoryData(prev => ({
        ...prev,
        generatedStory: result.story,
        isGenerating: false,
      }));

    } catch (error) {
      console.error('Error generating story:', error);
      alert('Error generating story, please try again later');
      setStoryData(prev => ({ ...prev, isGenerating: false }));
    }
  }, [storyData.travelDays, storyData.uploadedImages]);

  const copyStoryToClipboard = useCallback(() => {
    navigator.clipboard.writeText(storyData.generatedStory)
      .then(() => alert('Story copied to clipboard!'))
      .catch(() => alert('Copy failed'));
  }, [storyData.generatedStory]);

  const downloadStory = useCallback(() => {
    const blob = new Blob([storyData.generatedStory], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fukui_Travel_Story_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [storyData.generatedStory]);

  return (
    <div className="h-full bg-gradient-to-br from-purple-50 to-pink-50 p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto space-y-8"
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
            <h1 className="text-2xl font-bold text-purple-800">Fukui Travel Story Generator</h1>
            <Sparkles className="w-6 h-6 text-purple-600" />
          </motion.div>
          <p className="mt-4 text-gray-600">Share your Fukui journey and let AI create your personalized travel story</p>
        </div>

        {/* Travel Days Management */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-green-500" />
              Travel Itinerary
            </h2>
            <button
              onClick={addTravelDay}
              className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Day</span>
            </button>
          </div>
          
          <div className="space-y-4">
            {storyData.travelDays.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No travel days added yet. Click "Add Day" to start planning your itinerary.</p>
              </div>
            ) : (
              storyData.travelDays.map((day, dayIndex) => (
                <motion.div
                  key={day.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-semibold text-gray-700">
                        Day {dayIndex + 1}
                      </h3>
                      <input
                        type="date"
                        value={day.date}
                        onChange={(e) => updateTravelDayDate(day.id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => removeTravelDay(day.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Location Selection for this day */}
                  <div className="space-y-4">
                    <select
                      onChange={(e) => handleLocationSelect(day.id, e)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      defaultValue=""
                    >
                      <option value="" disabled>Select location for this day...</option>
                      {allLocations.map((location, index) => (
                        <option key={index} value={location.name}>
                          {location.name} ({location.city})
                        </option>
                      ))}
                    </select>

                    {/* Selected locations for this day */}
                    <AnimatePresence>
                      {day.locations.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <h4 className="text-sm font-medium text-gray-600">Locations for Day {dayIndex + 1}:</h4>
                          <div className="flex flex-wrap gap-2">
                            {day.locations.map((location) => (
                              <motion.div
                                key={location.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                              >
                                <span>{location.name}</span>
                                <button
                                  onClick={() => removeLocation(day.id, location.id)}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Photo Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Camera className="w-5 h-5 mr-2 text-orange-500" />
            Upload Travel Photos
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 transition-colors flex flex-col items-center space-y-2 text-gray-600 hover:text-purple-600"
            >
              <Upload className="w-8 h-8" />
              <span>Click to upload photos or drag and drop here</span>
              <span className="text-sm">Supports JPG, PNG formats</span>
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Uploaded photo preview */}
            <AnimatePresence>
              {storyData.uploadedImages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  {storyData.uploadedImages.map((file, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Uploaded photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Generate Story Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={generateStory}
            disabled={storyData.isGenerating || storyData.travelDays.flatMap(day => day.locations).length === 0}
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {storyData.isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Generating story...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                <span>Generate My Fukui Travel Story</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Generated Story Display Area */}
        <AnimatePresence>
          {storyData.generatedStory && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-purple-600" />
                  Your Fukui Travel Story
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
                  {storyData.generatedStory}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default StoryMode;
