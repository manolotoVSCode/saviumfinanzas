import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 64 }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/images/logo.png" 
        alt="Savium Finance"
        className="h-14 w-auto"
      />
    </div>
  );
};

export default Logo;
