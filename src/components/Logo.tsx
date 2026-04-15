import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 64 }) => {
  const { theme } = useTheme();

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/lovable-uploads/ca25ffc9-53d3-4773-9f62-29b073a48ce0.png" 
        alt="Savium Finance"
        className="h-14 w-auto"
        style={theme === 'dark' ? { filter: 'invert(1) brightness(2)' } : undefined}
      />
    </div>
  );
};

export default Logo;
