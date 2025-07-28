import React from 'react';
import logoCube from '@/assets/logo-cube-only.png';
// Logo component for Savium

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 64 }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src={logoCube} 
        alt="Savium"
        className="h-12 w-auto"
      />
    </div>
  );
};

export default Logo;