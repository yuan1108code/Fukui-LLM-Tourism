import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import ChatInterface from './components/ChatInterface';
import MapView from './components/MapView';
import StoryModeDemo from './components/StoryModeDemo';
import StoryModeReal from './components/StoryModeReal';
import Header from './components/Header';
import QuickActions from './components/QuickActions';
import LoadingScreen from './components/LoadingScreen';
import { apiService } from './services/api';
import { ChatMessage, LocationData, UserLocation } from './services/api';

interface AppState {
  messages: ChatMessage[];
  locations: LocationData[];
  shrines: LocationData[];  // Shrine data
  customLocations: LocationData[];  // User-defined custom locations
  isLoading: boolean;
  isMapView: boolean;
  isStoryMode: boolean;  // Story mode state
  isEditMode: boolean;  // Edit mode state
  healthStatus: 'checking' | 'healthy' | 'unhealthy';
  userLocation: UserLocation | null;
  selectedLocation: LocationData | null;  // Currently selected location
  showEditForm: boolean;  // Show edit form state
  editFormCoordinates: { lat: number; lng: number } | null;  // Coordinates for edit form
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    messages: [
      {
        id: 'welcome',
        text: 'Hello! I am your Fukui Tourism AI Assistant 🏯\n\nI can help you:\n• Explore shrines and attractions in Fukui Prefecture\n• Provide detailed travel information\n• Recommend suitable sightseeing routes\n\nHow can I assist you today?',
        isUser: false,
        timestamp: new Date(),
      },
    ],
    locations: [],
    shrines: [],  // Initialize shrine data
    customLocations: [],  // Initialize custom locations
    isLoading: true,
    isMapView: false,
    isStoryMode: false,  // Initialize story mode as closed
    isEditMode: false,  // Initialize edit mode as closed
    healthStatus: 'checking',
    userLocation: null,
    selectedLocation: null,
    showEditForm: false,
    editFormCoordinates: null,
  });

  // Initialize application
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, healthStatus: 'checking' }));

      // Check backend health status
      const healthResponse = await apiService.healthCheck();
      console.log('Backend service status:', healthResponse);
      
      // Load location data
      const locationsResponse = await apiService.getLocations();
      
      // Load shrine data
      let shrinesResponse: { locations: LocationData[] } = { locations: [] };
      try {
        shrinesResponse = await apiService.getShrines();
      } catch (error) {
        console.warn('Failed to load shrine data:', error);
      }
      
      setState(prev => ({
        ...prev,
        locations: locationsResponse.locations,
        shrines: shrinesResponse.locations,
        healthStatus: 'healthy',
        isLoading: false,
      }));

      console.log(`Successfully loaded ${locationsResponse.locations.length} attraction data and ${shrinesResponse.locations.length} shrine data`);
      
    } catch (error) {
      console.error('Application initialization failed:', error);
      setState(prev => ({
        ...prev,
        healthStatus: 'unhealthy',
        isLoading: false,
      }));
      
      // Add error message to chat interface
      addMessage('Sorry, unable to connect to backend service. Please ensure the service is running.', false);
    }
  };

  const addMessage = useCallback((text: string, isUser: boolean, sources?: any[]) => {
    const newMessage: ChatMessage = {
      id: `${isUser ? 'user' : 'assistant'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      isUser,
      timestamp: new Date(),
      sources,
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    // Add user message
    addMessage(message, true);

    // Record start time
    const startTime = Date.now();

    // Add loading indicator with unique ID
    const loadingMessageId = `loading-${Date.now()}`;
    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      text: '',
      isUser: false,
      timestamp: new Date(),
    };
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, loadingMessage],
    }));

    try {
      // Prepare timestamp
      const currentTimestamp = new Date().toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'long'
      });
      
      // Send message, including location and time information
      const response = await apiService.sendMessage(
        message, 
        true, 
        state.userLocation || undefined, 
        currentTimestamp
      );
      
      // Calculate response time
      const endTime = Date.now();
      const responseTimeSeconds = Math.round((endTime - startTime) / 1000);
      
      // Replace loading indicator with actual response
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === loadingMessageId 
            ? {
                ...msg,
                text: response.answer,
                sources: response.sources,
                responseTime: responseTimeSeconds,
              }
            : msg
        ),
      }));
      
    } catch (error: any) {
      // Replace loading indicator with error message
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === loadingMessageId
            ? {
                ...msg,
                text: `抱歉，處理您的請求時發生錯誤：${error.message}`,
              }
            : msg
        ),
      }));
    }
  }, [addMessage, state.userLocation]);

  const handleLocationUpdate = useCallback((location: UserLocation | null) => {
    setState(prev => ({
      ...prev,
      userLocation: location,
    }));
  }, []);

  const [inputText, setInputText] = useState<string>('');

  const handleQuickAction = useCallback((action: string, customText?: string) => {
    const quickQuestions: Record<string, string> = {
      shrines: 'Please recommend some famous shrines in Fukui Prefecture',
      attractions: 'What are the must-visit tourist attractions in Fukui Prefecture?',
      food: 'What are the specialty foods in Fukui Prefecture?',
      transportation: 'How can I get to Fukui Prefecture? What transportation options are available?',
    };

    const question = customText || quickQuestions[action];
    if (question) {
      setInputText(question);
    }
  }, []);

  const toggleView = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isMapView: !prev.isMapView,
      isEditMode: false,  // Close edit mode when switching views
      isStoryMode: false  // Close story mode when switching views
    }));
  }, []);

  const toggleEditMode = useCallback(() => {
    setState(prev => ({ ...prev, isEditMode: !prev.isEditMode }));
  }, []);

  const toggleStoryMode = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isStoryMode: !prev.isStoryMode,
      isMapView: false,  // Close map view when entering story mode
      isEditMode: false  // Close edit mode when entering story mode
    }));
  }, []);

  const addCustomLocation = useCallback((newLocation: LocationData) => {
    setState(prev => ({
      ...prev,
      customLocations: [...prev.customLocations, newLocation]
    }));
  }, []);

  // Memoize computed values
  const isLoadingComputed = useMemo(() => 
    state.messages.some(msg => msg.text === ''), 
    [state.messages]
  );

  // Show loading screen
  if (state.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col overflow-hidden">
      {/* Top navigation */}
      <Header 
        isMapView={state.isMapView} 
        onToggleView={toggleView}
        healthStatus={state.healthStatus}
        onRefresh={initializeApp}
        isEditMode={state.isEditMode}
        onToggleEditMode={toggleEditMode}
        isStoryMode={state.isStoryMode}
        onToggleStoryMode={toggleStoryMode}
      />

      {/* Main content area */}
      <motion.div 
        className="flex-1 flex overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Story Mode */}
        {state.isStoryMode ? (
          <motion.div 
            className="w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <StoryModeReal 
              availableLocations={state.locations}
              availableShrines={state.shrines}
            />
          </motion.div>
        ) : (
          <>
            {/* Left chat interface */}
            <motion.div 
              className={`${state.isMapView ? 'w-1/2 border-r border-gray-200' : 'w-full'} flex flex-col`}
              layout
              transition={{ duration: 0.3 }}
            >
              {/* Quick action buttons */}
              <QuickActions 
                onQuickAction={handleQuickAction} 
                onLocationUpdate={handleLocationUpdate}
              />
              
              {/* Chat interface */}
              <div className="flex-1 overflow-hidden">
                <ChatInterface
                  messages={state.messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoadingComputed}
                  inputText={inputText}
                  onInputTextChange={setInputText}
                />
              </div>
            </motion.div>

            {/* Right side map */}
            {state.isMapView && (
              <motion.div 
                className="w-1/2"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.3 }}
              >
                <MapView 
                  locations={state.locations} 
                  shrines={state.shrines} 
                  customLocations={state.customLocations}
                  isEditMode={state.isEditMode}
                  onAddCustomLocation={addCustomLocation}
                />
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default App;
