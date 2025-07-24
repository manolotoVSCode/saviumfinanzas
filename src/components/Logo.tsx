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
        <circle cx="16" cy="16" r="14" fill="#22c55e" stroke="#16a34a" strokeWidth="2"/>
        <path 
          d="M12 14c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2v-4z" 
          fill="white"
        />
        <circle cx="16" cy="10" r="2" fill="white"/>
        <path d="M16 22v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span className="font-bold text-green-600">savium</span>
    </div>
  );
};

export default Logo;