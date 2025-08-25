import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, Copy, Download } from 'lucide-react';

const StoryModeDemo: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [story, setStory] = useState('');

  const demoStory = `# My Fukui Prefecture Adventure 🏯

It was a sunny spring day when I embarked on my journey to Fukui Prefecture. With anticipation for this ancient land, I began an unforgettable cultural exploration journey.

## 🌸 The Magnificent Seascape of Tojinbo

My first stop was the famous Tojinbo, where the spectacular columnar jointed coastline left me in awe. Standing at the edge of the cliff, gazing at the azure Sea of Japan, with the sea breeze gently caressing my face, I could feel nature's craftsmanship over hundreds of millions of years. As the sun set, the entire sea was dyed golden, and that moment's beauty is still deeply imprinted in my heart.

## 🏯 The Historical Charm of Fukui Castle Ruins

Walking through Fukui Castle Ruins Park, although the ancient castle no longer exists, the heavy historical atmosphere still hits you. During the spring cherry blossom season, pink petals fall on the stone walls, creating a beautiful historical painting. I could almost hear the footsteps of samurai from the past and feel the changing fortunes of the Sengoku period.

## 🦕 The Wonder of Fukui Prefectural Dinosaur Museum

As an important site for dinosaur fossil discoveries, the Fukui Prefectural Dinosaur Museum is absolutely not to be missed. The massive dinosaur skeleton specimens made me feel like I had returned to prehistoric times. Those giant beasts that once dominated this land have now turned into precious fossils, telling us stories from hundreds of millions of years ago.

## 🍽️ Savoring Local Cuisine

The most memorable part of the journey was Fukui's cuisine. Fresh Echizen crab, sweet Fukui plums, and that authentic sauce pork cutlet bowl - each dish was filled with local character. In the traditional restaurants in the alleys, the warm lighting and the owner's friendly smile made this journey even more heartwarming.

## 💭 Reflections on the Journey

This Fukui journey made me deeply feel the charm of Japanese history and culture. From natural landscapes to historical sites, from food culture to human customs, Fukui Prefecture interprets Japan's beauty in its unique way.

Although the journey has ended, those beautiful memories will always accompany me. Fukui Prefecture, a place worth savoring carefully, I will definitely visit again!

---
✨ *This is my Fukui story, and I hope you also have the opportunity to personally experience the charm of this beautiful land!*`;

  const generateDemo = () => {
    setIsGenerating(true);
    // Simulate API delay
    setTimeout(() => {
      setStory(demoStory);
      setIsGenerating(false);
    }, 2000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(story)
      .then(() => alert('Story copied to clipboard!'))
      .catch(() => alert('Copy failed'));
  };

  const downloadStory = () => {
    const blob = new Blob([story], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fukui_Travel_Story_${new Date().toISOString().split('T')[0]}.txt`;
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
            <h1 className="text-2xl font-bold text-purple-800">Fukui Travel Story Book Generator</h1>
            <Sparkles className="w-6 h-6 text-purple-600" />
          </motion.div>
          <p className="mt-4 text-gray-600">Experience AI creating your personalized travel story book (Demo Version)</p>
        </div>

        {/* Demo information */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Demo Instructions</h2>
          <p className="text-blue-700">
            This is a demo version of the Story Mode feature. In the full version, you can:
          </p>
          <ul className="mt-2 text-blue-700 list-disc list-inside space-y-1">
            <li>Select actual Fukui Prefecture locations you visited</li>
            <li>Upload travel photos</li>
            <li>Set travel dates</li>
            <li>AI will generate personalized travel stories based on this information</li>
          </ul>
        </motion.div>

        {/* Generate button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <button
            onClick={generateDemo}
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
                <span>Generate Demo Story Book</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Generated story */}
        {story && (
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
                  onClick={copyToClipboard}
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
                {story}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default StoryModeDemo;
