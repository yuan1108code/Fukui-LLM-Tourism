import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../services/api';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  inputText?: string;
  onInputTextChange?: (text: string) => void;
}

// 分離出訊息顯示區域元件
const MessagesArea = memo(({ messages }: { messages: ChatMessage[] }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const LoadingDots = memo(() => (
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
  ));

  const MessageBubble = memo(({ message }: { message: ChatMessage }) => (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-start space-x-3 max-w-[85%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
            message.isUser 
              ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
              : 'bg-gradient-to-br from-red-500 to-pink-500'
          }`}
        >
          {message.isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>

        {/* Message content */}
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
          message.isUser
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
            : 'bg-white border border-gray-200'
        }`}>
          {message.text ? (
            <div className={`prose prose-sm max-w-none ${message.isUser ? 'prose-invert text-white' : 'text-gray-800'}`}>
              {message.isUser ? (
                <p className="whitespace-pre-line leading-relaxed">
                  {message.text}
                </p>
              ) : (
                <ReactMarkdown 
                  className="markdown-content"
                  components={{
                    // 客製化 heading 樣式
                    h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-base font-semibold mb-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-medium mb-1" {...props} />,
                    // 客製化 paragraph 樣式
                    p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                    // 客製化 list 樣式
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                    // 客製化 strong 樣式
                    strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                    // 客製化 code 樣式
                    code: ({node, ...props}) => <code className="bg-gray-100 px-1 rounded text-sm" {...props} />,
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              )}
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
            <span>
              {message.timestamp.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            {!message.isUser && message.responseTime && (
              <span className="ml-2">
                • Response time: {message.responseTime}s
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  ), (prevProps, nextProps) => {
    // 只有當 message 的關鍵屬性改變時才重新渲染
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.text === nextProps.message.text &&
      prevProps.message.isUser === nextProps.message.isUser &&
      JSON.stringify(prevProps.message.sources) === JSON.stringify(nextProps.message.sources)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      <AnimatePresence>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
}, (prevProps, nextProps) => {
  // 只有當 messages 陣列真正改變時才重新渲染
  return (
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.messages.every((msg, index) => 
      msg.id === nextProps.messages[index]?.id &&
      msg.text === nextProps.messages[index]?.text
    )
  );
});

// 分離出輸入區域元件
const InputArea = memo(({ onSendMessage, isLoading, externalInputText, onInputTextChange }: { 
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  externalInputText?: string;
  onInputTextChange?: (text: string) => void;
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external input text
  useEffect(() => {
    if (externalInputText !== undefined) {
      setInputMessage(externalInputText);
    }
  }, [externalInputText]);

  // Focus input field
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading && !isComposing) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  }, [inputMessage, isLoading, isComposing, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [isComposing, handleSubmit]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputMessage(newValue);
    // Notify parent component about the change
    onInputTextChange?.(newValue);
  }, [onInputTextChange]);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  return (
    <motion.div 
      className="border-t border-gray-200 bg-white/80 backdrop-blur-sm p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder="Ask about tourist attractions or shrines in Fukui Prefecture... (responses will be in English)"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
            disabled={isLoading}
            maxLength={500}
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
  );
}, (prevProps, nextProps) => {
  // 只有當 onSendMessage、isLoading、externalInputText 或 onInputTextChange 改變時才重新渲染
  return prevProps.isLoading === nextProps.isLoading && 
         prevProps.onSendMessage === nextProps.onSendMessage &&
         prevProps.externalInputText === nextProps.externalInputText &&
         prevProps.onInputTextChange === nextProps.onInputTextChange;
});

const ChatInterface: React.FC<ChatInterfaceProps> = memo(({ 
  messages, 
  onSendMessage, 
  isLoading, 
  inputText, 
  onInputTextChange 
}) => {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      {/* Messages area - 現在是獨立元件，不會因為輸入變化而重新渲染 */}
      <MessagesArea messages={messages} />
      
      {/* Input area - 獨立元件，只處理輸入邏輯 */}
      <InputArea 
        onSendMessage={onSendMessage} 
        isLoading={isLoading}
        externalInputText={inputText}
        onInputTextChange={onInputTextChange}
      />
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;
