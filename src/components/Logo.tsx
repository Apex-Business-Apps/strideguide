import React from 'react';
import strideGuideLogo from '@/assets/stride-guide-logo.png';

interface LogoProps {
  variant?: 'wordmark' | 'monogram';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'wordmark', className = '' }) => {
  return (
    <img 
      src={strideGuideLogo}
      alt="StrideGuide logo"
      className={className}
      style={{ 
        height: variant === 'monogram' ? '192px' : '80px',
        width: 'auto',
        transform: 'scaleX(1.15)'
      }}
    />
  );
};

export default Logo;