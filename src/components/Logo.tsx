import React from 'react';

interface LogoProps {
  variant?: 'wordmark' | 'monogram';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'wordmark', className = '' }) => {
  if (variant === 'monogram') {
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="192" 
        height="192" 
        viewBox="0 0 192 192" 
        role="img" 
        aria-label="StrideGuide monogram"
        className={className}
      >
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary-dark))" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" rx="32" fill="hsl(var(--background))" />
        {/* Stylized S */}
        <path 
          d="M48,72 C48,48 72,36 96,36 s48,12 48,36 c0,24 -24,30 -48,36 s-48,12 -48,36 24,36 48,36 48,-12 48,-36" 
          fill="none" 
          stroke="url(#g)" 
          strokeWidth="16" 
          strokeLinecap="round"
        />
        {/* Guide arrow (G) */}
        <path 
          d="M96,96 m36,0 a36,36 0 1 1 -72,0" 
          fill="none" 
          stroke="hsl(var(--accent))" 
          strokeWidth="16" 
          strokeLinecap="round"
        />
        <path 
          d="M96 60 L96 96 L128 96" 
          fill="none" 
          stroke="hsl(var(--accent))" 
          strokeWidth="16" 
          strokeLinecap="round"
        />
        <circle cx="128" cy="96" r="6" fill="hsl(var(--accent))" />
      </svg>
    );
  }

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="640" 
      height="160" 
      viewBox="0 0 640 160" 
      role="img" 
      aria-label="StrideGuide wordmark"
      className={className}
    >
      <defs>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap');
            .mark { 
              fill: hsl(var(--primary)); 
              font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-weight: 800; 
              letter-spacing: -0.5px; 
            }
          `}
        </style>
      </defs>
      <rect width="100%" height="100%" fill="hsl(var(--background))" />
      <text x="40" y="108" className="mark" fontSize="84">StrideGuide</text>
    </svg>
  );
};

export default Logo;