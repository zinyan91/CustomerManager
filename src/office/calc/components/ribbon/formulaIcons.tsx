import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Icon AutoSum: Ký hiệu Sigma chuẩn Excel */
export const ExcelBookIcon: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 28,
  className,
  style,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    {/* Bìa sau & gáy trang giấy */}
    <rect x="5" y="3" width="18" height="22" rx="2" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 23C7 24.2 11 24.2 14 23C17 24.2 21 24.2 23 23" stroke="currentColor" strokeWidth="1.2" fill="none" />
    {/* Mép giấy phía dưới */}
    <path d="M5 21C7 22.2 11 22.2 14 21C17 22.2 21 22.2 23 21" stroke="#888888" strokeWidth="0.8" fill="none" />
    {/* Biểu tượng chuyên biệt ở giữa sách */}
    {children}
  </svg>
);

export const AutoSumSigmaIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <path
      d="M7 6H21V8.5L14.2 14L21 19.5V22H7V19.5H16.8L11 14L16.8 8.5H7V6Z"
      fill="currentColor"
    />
  </svg>
);

/** Icon fx Insert Function */
export const InsertFunctionFxIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <text
      x="4"
      y="21"
      fontFamily="'Cambria Math', 'Times New Roman', serif"
      fontSize="22"
      fontStyle="italic"
      fontWeight="bold"
      fill="currentColor"
    >
      fx
    </text>
  </svg>
);

/** Icon Recently Used: Quyển sách có ngôi sao viền xanh */
export const RecentlyUsedIcon: React.FC<IconProps> = (props) => (
  <ExcelBookIcon {...props}>
    {/* Ngôi sao xanh lam */}
    <polygon
      points="14,6.5 16.2,11.2 21.2,11.8 17.5,15.2 18.5,20.2 14,17.7 9.5,20.2 10.5,15.2 6.8,11.8 11.8,11.2"
      fill="none"
      stroke="var(--fl-accent)"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </ExcelBookIcon>
);

/** Icon Financial: Quyển sách có chồng tiền xu màu xanh lá */
export const FinancialIcon: React.FC<IconProps> = (props) => (
  <ExcelBookIcon {...props}>
    {/* Chồng tiền xu 4 lớp */}
    <ellipse cx="14" cy="8" rx="6" ry="2.2" fill="var(--fl-accent)" fillOpacity="0.2" stroke="var(--fl-accent)" strokeWidth="1.2" />
    <path d="M8 8V11C8 12.2 10.7 13.2 14 13.2C17.3 13.2 20 12.2 20 11V8" stroke="var(--fl-accent)" strokeWidth="1.2" fill="none" />
    <path d="M8 11V14C8 15.2 10.7 16.2 14 16.2C17.3 16.2 20 15.2 20 14V11" stroke="var(--fl-accent)" strokeWidth="1.2" fill="none" />
    <path d="M8 14V17C8 18.2 10.7 19.2 14 19.2C17.3 19.2 20 18.2 20 17V14" stroke="var(--fl-accent)" strokeWidth="1.2" fill="none" />
  </ExcelBookIcon>
);

/** Icon Logical: Quyển sách có dấu hỏi chấm màu tím */
export const LogicalIcon: React.FC<IconProps> = (props) => (
  <ExcelBookIcon {...props}>
    <text
      x="14"
      y="18.5"
      textAnchor="middle"
      fontFamily="Segoe UI, -apple-system, sans-serif"
      fontSize="16"
      fontWeight="bold"
      fill="#744da9"
    >
      ?
    </text>
  </ExcelBookIcon>
);

/** Icon Text: Quyển sách có chữ A màu xanh lam */
export const TextFunctionIcon: React.FC<IconProps> = (props) => (
  <ExcelBookIcon {...props}>
    <text
      x="14"
      y="18"
      textAnchor="middle"
      fontFamily="Segoe UI, -apple-system, sans-serif"
      fontSize="15"
      fontWeight="bold"
      fill="var(--fl-accent)"
    >
      A
    </text>
  </ExcelBookIcon>
);

/** Icon Date & Time: Quyển sách có mặt đồng hồ tròn đỏ cam */
export const DateTimeFunctionIcon: React.FC<IconProps> = (props) => (
  <ExcelBookIcon {...props}>
    <circle cx="14" cy="13.5" r="5.5" stroke="#d83b01" strokeWidth="1.2" fill="none" />
    {/* 2 kim đồng hồ lúc 3 giờ */}
    <polyline points="14,10 14,13.5 17,13.5" stroke="#d83b01" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </ExcelBookIcon>
);

/** Icon Lookup & Reference: Quyển sách có kính lúp xanh lam */
export const LookupRefIcon: React.FC<IconProps> = (props) => (
  <ExcelBookIcon {...props}>
    <circle cx="12.5" cy="12" r="4.2" stroke="var(--fl-accent)" strokeWidth="1.3" fill="none" />
    <line x1="15.8" y1="15.2" x2="19.5" y2="19" stroke="var(--fl-accent)" strokeWidth="1.6" strokeLinecap="round" />
  </ExcelBookIcon>
);

/** Icon Math & Trig: Quyển sách có ký hiệu theta màu xanh lá */
export const MathTrigIcon: React.FC<IconProps> = (props) => (
  <ExcelBookIcon {...props}>
    <text
      x="14"
      y="18.5"
      textAnchor="middle"
      fontFamily="'Cambria Math', 'Times New Roman', serif"
      fontSize="17"
      fontWeight="bold"
      fill="var(--fl-accent)"
    >
      θ
    </text>
  </ExcelBookIcon>
);

/** Icon More Functions: Quyển sách có biểu tượng thống kê / mở rộng */
export const MoreFunctionsIcon: React.FC<IconProps> = (props) => (
  <ExcelBookIcon {...props}>
    <rect x="8" y="14" width="3" height="5" fill="var(--fl-accent)" />
    <rect x="12.5" y="10" width="3" height="9" fill="var(--fl-accent)" />
    <rect x="17" y="7" width="3" height="12" fill="#d83b01" />
  </ExcelBookIcon>
);

/** Icon Name Manager: Thẻ tag có bảng lưới nhỏ ở góc */
export const NameManagerIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    {/* Thẻ tag vàng/xám */}
    <path
      d="M17.5 4H8C6.9 4 6 4.9 6 6V15.5L14.5 24L24 14.5L17.5 4Z"
      fill="var(--bg-surface)"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="8" r="1.5" fill="currentColor" />
    {/* Bảng ô nhỏ màu xanh bên góc */}
    <rect x="14" y="14" width="9" height="9" rx="1" fill="var(--bg-surface)" stroke="var(--fl-accent)" strokeWidth="1.1" />
    <line x1="14" y1="18.5" x2="23" y2="18.5" stroke="var(--fl-accent)" strokeWidth="0.9" />
    <line x1="18.5" y1="14" x2="18.5" y2="23" stroke="var(--fl-accent)" strokeWidth="0.9" />
  </svg>
);

/** Icon nhỏ Trace Precedents */
export const TracePrecedentsIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <rect x="1.5" y="1.5" width="5" height="5" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <rect x="9.5" y="9.5" width="5" height="5" stroke="var(--fl-accent)" strokeWidth="1" fill="var(--bg-surface)" />
    <path d="M4 6.5V12H9" stroke="var(--fl-accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <polygon points="9,10.5 11.5,12 9,13.5" fill="var(--fl-accent)" />
  </svg>
);

/** Icon nhỏ Trace Dependents */
export const TraceDependentsIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <rect x="9.5" y="1.5" width="5" height="5" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <rect x="1.5" y="9.5" width="5" height="5" stroke="var(--fl-accent)" strokeWidth="1" fill="var(--bg-surface)" />
    <path d="M4 9.5V4H9" stroke="var(--fl-accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <polygon points="9,2.5 11.5,4 9,5.5" fill="var(--fl-accent)" />
  </svg>
);

/** Icon nhỏ Show Formulas */
export const ShowFormulasIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <polygon points="1.5,1.5 14.5,1.5 14.5,14.5" fill="none" stroke="currentColor" strokeWidth="1" />
    <text x="3" y="12" fontFamily="serif" fontStyle="italic" fontWeight="bold" fontSize="9" fill="var(--fl-accent)">
      fx
    </text>
  </svg>
);

/** Icon nhỏ Calculate Now */
export const CalculateSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <rect x="2.5" y="1.5" width="11" height="13" rx="1" fill="var(--bg-surface)" stroke="var(--fl-accent)" strokeWidth="1" />
    <rect x="4.5" y="3.5" width="7" height="2.5" fill="var(--bg-surface-hover)" />
    <circle cx="5" cy="8.5" r="0.7" fill="var(--fl-accent)" />
    <circle cx="8" cy="8.5" r="0.7" fill="var(--fl-accent)" />
    <circle cx="11" cy="8.5" r="0.7" fill="var(--fl-accent)" />
    <circle cx="5" cy="11.5" r="0.7" fill="var(--fl-accent)" />
    <circle cx="8" cy="11.5" r="0.7" fill="var(--fl-accent)" />
    <circle cx="11" cy="11.5" r="0.7" fill="var(--fl-accent)" />
  </svg>
);

/** Icon nhỏ Calculate Sheet: Máy tính kèm lưới trang tính */
export const CalculateSheetSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <rect x="1.5" y="1.5" width="7" height="13" rx="1" fill="var(--bg-surface)" stroke="var(--fl-accent)" strokeWidth="1" />
    <rect x="2.5" y="3" width="5" height="2" fill="var(--bg-surface-hover)" />
    <circle cx="3.5" cy="7.5" r="0.6" fill="var(--fl-accent)" />
    <circle cx="6.5" cy="7.5" r="0.6" fill="var(--fl-accent)" />
    <circle cx="3.5" cy="10.5" r="0.6" fill="var(--fl-accent)" />
    <circle cx="6.5" cy="10.5" r="0.6" fill="var(--fl-accent)" />
    {/* Lưới trang tính bên phải */}
    <rect x="9.5" y="4.5" width="6" height="10" fill="var(--bg-surface)" stroke="var(--fl-accent)" strokeWidth="1" />
    <line x1="9.5" y1="7.5" x2="15.5" y2="7.5" stroke="var(--fl-accent)" strokeWidth="0.8" />
    <line x1="9.5" y1="11" x2="15.5" y2="11" stroke="var(--fl-accent)" strokeWidth="0.8" />
    <line x1="12.5" y1="4.5" x2="12.5" y2="14.5" stroke="var(--fl-accent)" strokeWidth="0.8" />
  </svg>
);

/** Icon nhỏ Define Name */
export const DefineNameSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <path
      d="M10 2H4.5C3.7 2 3 2.7 3 3.5V9L8.5 14.5L14 9L10 2Z"
      fill="var(--bg-surface)"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    <circle cx="6" cy="5" r="1" fill="currentColor" />
  </svg>
);

/** Icon nhỏ Use in Formula: Thẻ tag có chữ fx */
export const UseInFormulaSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <path
      d="M9 2H4C3.4 2 3 2.4 3 3V8L7.5 12.5L12 8L9 2Z"
      fill="var(--bg-surface)"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <text x="7" y="15" fontFamily="serif" fontStyle="italic" fontWeight="bold" fontSize="7.5" fill="var(--fl-accent)">
      fx
    </text>
  </svg>
);

/** Icon nhỏ Create from Selection */
export const CreateFromSelectionSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <rect x="1.5" y="1.5" width="9" height="9" stroke="var(--fl-accent)" strokeWidth="1" fill="#e6f2fb" />
    <line x1="1.5" y1="4.5" x2="10.5" y2="4.5" stroke="var(--fl-accent)" strokeWidth="0.8" />
    <line x1="4.5" y1="1.5" x2="4.5" y2="10.5" stroke="var(--fl-accent)" strokeWidth="0.8" />
    {/* Thẻ tag nhỏ phía góc dưới bên phải */}
    <path d="M11 7.5L8.5 10L10.5 14.5L14.5 10.5L11 7.5Z" fill="var(--bg-surface)" stroke="#d83b01" strokeWidth="1" />
  </svg>
);


