import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../services/api';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input field
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading && !isComposing) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const LoadingDots = () => (
    <motion.div 
      className="flex space-x-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </motion.div>
  );

  const MessageBubble = ({ message }: { message: ChatMessage }) => (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-start space-x-3 max-w-[80%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <motion.div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
            message.isUser 
              ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
              : 'bg-gradient-to-br from-red-500 to-pink-500'
          }`}
          whileHover={{ scale: 1.1 }}
        >
          {message.isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </motion.div>

        {/* Message content */}
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
          message.isUser
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
            : 'bg-white border border-gray-200'
        }`}>
          {message.text ? (
            <div className={`prose prose-sm max-w-none ${message.isUser ? 'text-white' : 'text-gray-800'}`}>
              <p className="whitespace-pre-line leading-relaxed">
                {message.text}
              </p>
            </div>
          ) : (
            <LoadingDots />
          )}

          {/* Source information */}
          {message.sources && message.sources.length > 0 && (
            <motion.div 
              className="mt-3 pt-3 border-t border-gray-100"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <p className="text-xs text-gray-500 mb-2 font-medium">References:</p>
              <div className="space-y-2">
                {message.sources.map((source, index) => (
                  <motion.div
                    key={index}
                    className="bg-gray-50 rounded-lg p-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-xs text-gray-700">
                        {source.title}
                      </p>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {source.type === 'locations' ? 'Attraction' : 'Shrine'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-3">
                      {source.content}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Timestamp */}
          <div className={`text-xs mt-2 ${
            message.isUser ? 'text-blue-100' : 'text-gray-400'
          }`}>
            {message.timestamp.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <motion.div 
        className="border-t border-gray-200 bg-white/80 backdrop-blur-sm p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1">
            <motion.input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="Ask about tourist attractions or shrines in Fukui Prefecture... (responses will be in English)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              disabled={isLoading}
              maxLength={500}
              whileFocus={{ scale: 1.02 }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">
                {inputMessage.length}/500
              </span>
              <span className="text-xs text-gray-400">
                Enter to send, Shift+Enter for new line
              </span>
            </div>
          </div>
          
          <motion.button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || isComposing}
            className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-3 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default ChatInterface;
