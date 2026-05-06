import React from 'react';
import { motion } from 'motion/react';

export default function LoadingScreen({ message = "Kiss me Store is preparing your experience..." }: { message?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0A0A0A] w-full h-[100dvh] overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex flex-col items-center justify-center w-full px-8"
      >
        {/* Baymax-like Animation / Placeholder */}
        <div className="relative w-40 h-40 md:w-48 md:h-48 mb-8">
          <motion.img 
            src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ4ZzV4ZzV4ZzV4ZzV4ZzV4ZzV4ZzV4ZzV4ZzV4ZzV4ZzV4ZzV4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/vskS7PZJ1pYI0/giphy.gif"
            alt="Baymax Running"
            className="w-full h-full object-contain mx-auto"
            animate={{ 
              x: [-5, 5, -5],
              y: [0, -3, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.5,
              ease: "easeInOut"
            }}
          />
          {/* Floating Food Icons */}
          <motion.div 
            className="absolute -top-4 -right-4 text-3xl"
            animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0 }}
          >
            🍔
          </motion.div>
          <motion.div 
            className="absolute top-10 -left-6 text-3xl"
            animate={{ y: [0, -25, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, delay: 0.5 }}
          >
            🍕
          </motion.div>
          <motion.div 
            className="absolute -bottom-2 right-10 text-3xl"
            animate={{ y: [0, -15, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, delay: 1 }}
          >
            🥤
          </motion.div>
        </div>
        
        <div className="text-center max-w-sm w-full">
          <p className="text-gold font-serif italic text-lg md:text-xl mb-4 leading-tight">{message}</p>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gold"
                animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Progress gradient bar at top */}
      <motion.div 
        className="absolute top-0 left-0 h-1 bg-gold"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.div>
  );
}
