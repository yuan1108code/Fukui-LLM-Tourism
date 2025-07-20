import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Mountain, Utensils, Train } from 'lucide-react';

interface QuickActionsProps {
  onQuickAction: (action: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onQuickAction }) => {
  const actions = [
    {
      id: 'shrines',
      icon: Building2,
      label: 'Shrine Visits',
      color: 'from-red-500 to-pink-500',
      description: 'Explore Fukui shrines'
    },
    {
      id: 'attractions',
      icon: Mountain,
      label: 'Attractions',
      color: 'from-blue-500 to-cyan-500',
      description: 'Discover beautiful spots'
    },
    {
      id: 'food',
      icon: Utensils,
      label: 'Local Cuisine',
      color: 'from-green-500 to-emerald-500',
      description: 'Taste specialty dishes'
    },
    {
      id: 'transportation',
      icon: Train,
      label: 'Transportation',
      color: 'from-purple-500 to-indigo-500',
      description: 'Plan travel routes'
    }
  ];

  return (
    <div className="p-4 bg-white/50 backdrop-blur-sm border-b border-gray-100">
      <p className="text-sm text-gray-600 mb-3 font-medium">Quick Explore:</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            onClick={() => onQuickAction(action.id)}
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
            
            {/* 點擊效果 */}
            <motion.div
              className="absolute inset-0 bg-white/20 rounded-xl opacity-0"
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
