import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Mountain, Building2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >      {/* Logo animation */}
      <motion.div
        className="mb-8 relative"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          福
        </div>
        
        {/* Surrounding decorative icons */}
          <motion.div
            className="absolute -top-2 -left-2"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Building2 className="w-6 h-6 text-red-400" />
          </motion.div>
          
          <motion.div
            className="absolute -bottom-2 -right-2"
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            <Mountain className="w-6 h-6 text-blue-400" />
          </motion.div>
        </motion.div>      {/* Title */}
      <motion.h1
        className="text-3xl font-bold text-gray-800 mb-2 font-jp"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Fukui Tourism AI Assistant
      </motion.h1>      <motion.p
        className="text-gray-600 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        Initializing AI assistant and vector database...
      </motion.p>      {/* Loading animation */}
      <motion.div
        className="flex items-center justify-center space-x-2 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        <span className="text-blue-600 font-medium">Loading</span>
      </motion.div>      {/* Loading progress indicator */}
      <div className="w-64 mx-auto bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>      {/* Loading steps */}
      <motion.div
        className="mt-8 space-y-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <LoadingStep text="Connecting ChromaDB vector database" delay={0} />
        <LoadingStep text="Loading Fukui Prefecture tourism data" delay={0.5} />
        <LoadingStep text="Initializing OpenAI GPT-4o-mini" delay={1} />
        <LoadingStep text="Preparing Mapbox interactive map" delay={1.5} />
        <LoadingStep text="Starting intelligent Q&A system" delay={2} />
      </motion.div>      {/* Hint text */}
      <motion.div
        className="mt-8 text-sm text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 2.5 }}
      >
        <p>First load may take longer, please be patient...</p>
      </motion.div>
      </motion.div>
    </div>
  );
};

// Loading step component
interface LoadingStepProps {
  text: string;
  delay: number;
}

const LoadingStep: React.FC<LoadingStepProps> = ({ text, delay }) => {
  return (
    <motion.div
      className="flex items-center justify-center space-x-2 text-sm"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <motion.div
        className="w-2 h-2 bg-blue-400 rounded-full"
        animate={{ scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, delay }}
      />
      <span className="text-gray-600">{text}</span>
    </motion.div>
  );
};

export default LoadingScreen;
