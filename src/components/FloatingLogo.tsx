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
      }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
      }}
      className={`relative ${className}`}
    >
      <div className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(212,175,55,0.2)] transform-gpu transition-all duration-500 hover:scale-105`}>
        <img 
          src={src} 
          alt="Official Logo"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    </motion.div>
  );
}
