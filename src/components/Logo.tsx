import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

/** Cubo (PNG transparente, el del login) y texto en vivo: así sirve en claro y en oscuro. */
const Logo: React.FC<LogoProps> = ({ className = "", size = 56 }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/images/logo-auth.png"
        alt=""
        style={{ height: size * 0.75, width: size * 0.75 }}
      />
      <div className="leading-tight text-left">
        <p className="text-lg font-bold tracking-tight text-foreground">Savium Finance</p>
        <p className="text-[11px] text-muted-foreground font-medium">Wealth Management Platform</p>
      </div>
    </div>
  );
};

export default Logo;
