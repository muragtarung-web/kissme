import { motion } from 'motion/react';

interface FloatingLogoProps {
  src?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function FloatingLogo({ src, className = '', size = 'md' }: FloatingLogoProps) {
  if (!src) return null;

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-24 h-24',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64 md:w-80 md:h-80'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: [0, -6, 0],
      }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
        y: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
      className={`relative ${className}`}
    >
      <div className="absolute inset-0 bg-red-600/20 blur-[20px] rounded-full animate-neon-pulse pointer-events-none" />
      
      <div className="relative group flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 blur-lg translate-y-4 scale-90 rounded-full" />
        
        <div className={`relative ${sizeClasses[size]} rounded-xl p-0.5 overflow-hidden bg-black/20 backdrop-blur-sm border border-white/10 shadow-[0_0_20px_rgba(255,0,0,0.3)] transform-gpu transition-all duration-500 hover:scale-110`}>
          <img 
            src={src} 
            alt="Official Logo"
            className="w-full h-full object-cover rounded-lg"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-red-500/5 pointer-events-none" />
        </div>
      </div>
    </motion.div>
  );
}
