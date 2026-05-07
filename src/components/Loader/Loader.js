import React, { useEffect, useState } from 'react';
import { FaShoppingCart } from "react-icons/fa";
import { motion } from 'framer-motion';

const Loader = ({ loading }) => {
  const [truckPosition, setTruckPosition] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    if (loading) {
      // Bouncing animation
      const bounceInterval = setInterval(() => {
        setIsBouncing(prev => !prev);
      }, 800);
      
      // Movement animation
      const moveInterval = setInterval(() => {
        setTruckPosition((prev) => {
          if (prev >= 300) return -50; // Reset to left when off screen
          return prev + 1;
        });
      }, 20);
      
      return () => {
        clearInterval(bounceInterval);
        clearInterval(moveInterval);
      };
    }
  }, [loading]);

  if (!loading) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center space-y-6">
        {/* Truck with bouncing animation */}
        <div className="relative w-[350px] h-[120px] overflow-hidden">
          <motion.div
            className="absolute bottom-8"
            style={{ left: `${truckPosition}px` }}
            animate={{
              y: isBouncing ? [-2, 2, -2] : [0, 0, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <FaShoppingCart 
              size={64} 
              className="text-[#ce9f2d] drop-shadow-xl"
            />
            {/* Exhaust effect */}
            <motion.div 
              className="absolute -left-4 top-1/2 w-3 h-3 bg-gray-400 rounded-full opacity-70"
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.6, 0.3, 0.6],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
              }}
            />
          </motion.div>

          {truckPosition > 0 && (
            <motion.div 
              className="absolute bottom-10 left-0 w-8 h-4 bg-gray-500 rounded-full blur-sm opacity-70"
              style={{
                left: `${truckPosition - 20}px`,
              }}
              animate={{
                scale: [1, 1.5, 0],
                opacity: [0.7, 0.3, 0],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: 0.2
              }}
            />
          )}
        </div>

   
      </div>
    </motion.div>
  );
};

Loader.defaultProps = {
  loading: true,
};

export default React.memo(Loader);