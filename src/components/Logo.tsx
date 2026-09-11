import React from 'react';
import felixIcon from '../assets/felix-icon.png';
import felixIconDark from '../assets/felix-icon-dark.png';
import felixLogoLight from '../assets/felix-logo.png';
import felixLogoDark from '../assets/felix-logo-dark.png';

export interface LogoProps {
  className?: string;
  title?: string;
  variant?: 'icon' | 'full';
}

/**
 * Logo Felix — Biểu tượng mèo may mắn & cỏ 4 lá.
 * Hỗ trợ nền trong suốt (transparent) cho cả giao diện Sáng (Light) và Tối (Dark).
 */
export const Logo: React.FC<LogoProps> = ({
  className = 'w-8 h-8',
  title = 'Felix — Quản lý Khách hàng',
  variant = 'icon',
}) => {
  if (variant === 'full') {
    return (
      <span className={`inline-flex items-center select-none ${className}`}>
        <img
          src={felixLogoLight}
          alt={title}
          className="h-full w-auto max-h-full object-contain dark:hidden"
          loading="eager"
          decoding="async"
        />
        <img
          src={felixLogoDark}
          alt={title}
          className="h-full w-auto max-h-full object-contain hidden dark:inline-block"
          loading="eager"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src={felixIcon}
        alt={title}
        className="w-full h-full object-contain dark:hidden"
        loading="eager"
        decoding="async"
      />
      <img
        src={felixIconDark}
        alt={title}
        className="w-full h-full object-contain hidden dark:inline-block"
        loading="eager"
        decoding="async"
      />
    </span>
  );
};

