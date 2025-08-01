import React from 'react';
// Logo component for Savium

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 64 }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/lovable-uploads/ca25ffc9-53d3-4773-9f62-29b073a48ce0.png" 
        alt="Savium Finance"
        className="h-14 w-auto"
      />
    </div>
  );
};

export default Logo;