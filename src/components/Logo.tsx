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
        src="/lovable-uploads/fb338591-3b93-4742-9edf-dba5aeb496ef.png" 
        alt="Savium Finanzas Personales"
        className="h-12 w-auto"
      />
    </div>
  );
};

export default Logo;