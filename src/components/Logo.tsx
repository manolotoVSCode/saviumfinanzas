import React from 'react';
// Logo component for Savium

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 32 }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Cubo isométrico en verde */}
        {/* Cara superior */}
        <path 
          d="M16 8 L24 12 L16 16 L8 12 Z" 
          fill="#22c55e"
        />
        {/* Cara izquierda */}
        <path 
          d="M8 12 L16 16 L16 24 L8 20 Z" 
          fill="#16a34a"
        />
        {/* Cara derecha */}
        <path 
          d="M16 16 L24 12 L24 20 L16 24 Z" 
          fill="#15803d"
        />
      </svg>
      <span className="font-bold text-green-600">savium</span>
    </div>
  );
};

export default Logo;