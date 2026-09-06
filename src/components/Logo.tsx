import React from 'react';

interface LogoProps {
  className?: string;
  title?: string;
}

/**
 * Logo hệ thống Quản lý Khách hàng — biểu tượng khiên ngân hàng (mái + cột trụ).
 * Dùng CHUNG cho Header và trang đăng nhập để nhất quán thương hiệu. Nét vẽ theo
 * class fill-accent / fill-panel nên tự đổi đúng giao diện Sáng / Tối, sắc nét
 * mọi kích thước, không tải ảnh ngoài.
 */
export const Logo: React.FC<LogoProps> = ({ className = 'w-8 h-8', title = 'Quản lý Khách hàng' }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    role="img"
    aria-label={title}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M32 4L8 14V30C8 45.2 18.2 58.4 32 62C45.8 58.4 56 45.2 56 30V14L32 4Z"
      className="fill-accent"
    />
    <path
      d="M32 8L12 16.3V30C12 42.8 20.5 53.7 32 56.8C43.5 53.7 52 42.8 52 30V16.3L32 8Z"
      className="fill-panel"
    />
    <path d="M20 22H44V25H20V22Z" className="fill-accent" />
    <path d="M22 27H26V43H22V27Z" className="fill-accent" />
    <path d="M30 27H34V43H30V27Z" className="fill-accent" />
    <path d="M38 27H42V43H38V27Z" className="fill-accent" />
    <path d="M18 45H46V49H18V45Z" className="fill-accent" />
  </svg>
);
