import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** 2. From Text/CSV: Document sheet with CSV text */
export const FromTextCsvIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <path d="M7 3H17L22 8V24C22 24.6 21.6 25 21 25H7C6.4 25 6 24.6 6 24V4C6 3.4 6.4 3 7 3Z" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
    <polyline points="17,3 17,8 22,8" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <line x1="9" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <line x1="9" y1="14" x2="19" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <line x1="9" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <rect x="9" y="19" width="10" height="4" rx="0.5" fill="var(--fl-accent)" />
    <text x="14" y="22.2" textAnchor="middle" fontFamily="Segoe UI, sans-serif" fontSize="3" fontWeight="bold" fill="var(--bg-surface)">
      CSV
    </text>
  </svg>
);

/** 11. Sort Ascending small icon (A over Z with blue down arrow) */
export const SortAscSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <text x="2" y="7" fontFamily="Segoe UI, sans-serif" fontSize="7" fontWeight="bold" fill="currentColor">A</text>
    <text x="2" y="14" fontFamily="Segoe UI, sans-serif" fontSize="7" fontWeight="bold" fill="currentColor">Z</text>
    <line x1="10.5" y1="3" x2="10.5" y2="13" stroke="var(--fl-accent)" strokeWidth="1.4" strokeLinecap="round" />
    <polyline points="8,10.5 10.5,13.5 13,10.5" stroke="var(--fl-accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/** 12. Sort Descending small icon (Z over A with blue down arrow) */
export const SortDescSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <text x="2" y="7" fontFamily="Segoe UI, sans-serif" fontSize="7" fontWeight="bold" fill="currentColor">Z</text>
    <text x="2" y="14" fontFamily="Segoe UI, sans-serif" fontSize="7" fontWeight="bold" fill="currentColor">A</text>
    <line x1="10.5" y1="3" x2="10.5" y2="13" stroke="var(--fl-accent)" strokeWidth="1.4" strokeLinecap="round" />
    <polyline points="8,10.5 10.5,13.5 13,10.5" stroke="var(--fl-accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/** 13. Sort Custom Large Icon */
export const SortCustomLargeIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <rect x="4" y="3" width="12" height="22" rx="1.5" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
    <text x="7" y="10" fontFamily="Segoe UI, sans-serif" fontSize="8" fontWeight="bold" fill="var(--fl-accent)">A</text>
    <text x="7" y="21" fontFamily="Segoe UI, sans-serif" fontSize="8" fontWeight="bold" fill="var(--fl-accent)">Z</text>
    {/* Blue big arrow on right */}
    <line x1="21" y1="5" x2="21" y2="23" stroke="var(--fl-accent)" strokeWidth="2.2" strokeLinecap="round" />
    <polyline points="17,19 21,24 25,19" stroke="var(--fl-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/** 14. Filter Large Icon: Classic Excel Funnel */
export const FilterLargeIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <polygon points="5,5 23,5 16,15 16,23 12,21 12,15" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <polygon points="6.5,6.5 21.5,6.5 15,14.5 13,14.5" fill="var(--bg-surface-hover)" />
  </svg>
);

/** 15. Clear Filter small icon */
export const ClearFilterSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <polygon points="2,2 14,2 9.5,8.5 9.5,14 6.5,12 6.5,8.5" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="0.9" />
    <path d="M8 8L13 13M13 8L8 13" stroke="#d83b01" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** 16. Reapply Filter small icon */
export const ReapplyFilterSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <polygon points="2,2 14,2 9.5,8.5 9.5,14 6.5,12 6.5,8.5" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="0.9" />
    <path d="M12 9A3 3 0 1 0 14 12" stroke="var(--fl-accent)" strokeWidth="1.2" fill="none" />
    <polyline points="14,9 14,12 11,12" stroke="var(--fl-accent)" strokeWidth="1" fill="none" />
  </svg>
);

/** 17. Advanced Filter small icon */
export const AdvancedFilterSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <polygon points="2,2 14,2 9.5,8.5 9.5,14 6.5,12 6.5,8.5" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="0.9" />
    {/* Blue sparkles/star */}
    <path d="M11 8L11.7 10.3L14 11L11.7 11.7L11 14L10.3 11.7L8 11L10.3 10.3Z" fill="var(--fl-accent)" />
  </svg>
);

/** 18. Text to Columns: One column splitting into two with arrow */
export const TextToColumnsIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <rect x="4" y="6" width="6" height="16" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
    <line x1="4" y1="11" x2="10" y2="11" stroke="currentColor" strokeWidth="0.8" />
    <line x1="4" y1="16" x2="10" y2="16" stroke="currentColor" strokeWidth="0.8" />
    {/* Split arrow */}
    <path d="M11 14H15" stroke="var(--fl-accent)" strokeWidth="1.4" strokeLinecap="round" />
    <polyline points="13.5,12 15.5,14 13.5,16" stroke="var(--fl-accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Two columns on right */}
    <rect x="17" y="6" width="4" height="16" fill="var(--bg-surface)" stroke="var(--fl-accent)" strokeWidth="1.1" />
    <rect x="22" y="6" width="4" height="16" fill="var(--bg-surface)" stroke="var(--fl-accent)" strokeWidth="1.1" />
  </svg>
);

/** 19. Flash Fill: Spreadsheet column with yellow lightning bolt */
export const FlashFillIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <rect x="6" y="5" width="16" height="18" rx="1.5" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
    <line x1="6" y1="11" x2="22" y2="11" stroke="var(--border-strong)" strokeWidth="1" />
    <line x1="6" y1="17" x2="22" y2="17" stroke="var(--border-strong)" strokeWidth="1" />
    <line x1="14" y1="5" x2="14" y2="23" stroke="var(--border-strong)" strokeWidth="1" />
    {/* Yellow/Orange lightning bolt */}
    <polygon points="17,3 10,14 14,14 12,23 20,11 16,11" fill="#ffb900" stroke="#d83b01" strokeWidth="0.8" strokeLinejoin="round" />
  </svg>
);

/** 20. Remove Duplicates: Two columns with red X on duplicate */
export const RemoveDuplicatesIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <rect x="5" y="5" width="14" height="18" rx="1" fill="var(--bg-surface)" stroke="var(--fl-accent)" strokeWidth="1.2" />
    <line x1="5" y1="11" x2="19" y2="11" stroke="var(--fl-accent)" strokeWidth="1" />
    <line x1="5" y1="17" x2="19" y2="17" stroke="var(--fl-accent)" strokeWidth="1" />
    <line x1="12" y1="5" x2="12" y2="23" stroke="var(--fl-accent)" strokeWidth="1" />
    {/* Red X on bottom right */}
    <circle cx="19" cy="19" r="5" fill="var(--bg-surface)" stroke="#d83b01" strokeWidth="1" />
    <path d="M17 17L21 21M21 17L17 21" stroke="#d83b01" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** 21. Data Validation: Cells with green check and red prohibition symbol */
export const DataValidationIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <rect x="5" y="6" width="12" height="16" rx="1" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
    <line x1="5" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="0.8" />
    {/* Green check mark on top right */}
    <path d="M17 9L19.5 11.5L24 7" stroke="var(--fl-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Red circle with slash on bottom right */}
    <circle cx="20" cy="18" r="4.5" stroke="#d83b01" strokeWidth="1.4" fill="var(--bg-surface)" />
    <line x1="17" y1="15" x2="23" y2="21" stroke="#d83b01" strokeWidth="1.4" />
  </svg>
);

/** 24. What-If Analysis: Table with blue question mark */
export const WhatIfAnalysisIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <rect x="5" y="5" width="18" height="18" rx="1.5" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
    <line x1="5" y1="11" x2="23" y2="11" stroke="var(--border-strong)" strokeWidth="1" />
    <line x1="14" y1="5" x2="14" y2="23" stroke="var(--border-strong)" strokeWidth="1" />
    {/* Blue question mark */}
    <circle cx="18" cy="18" r="5" fill="var(--bg-surface)" stroke="var(--fl-accent)" strokeWidth="1" />
    <text x="18" y="21" textAnchor="middle" fontFamily="Segoe UI, sans-serif" fontSize="8" fontWeight="bold" fill="var(--fl-accent)">
      ?
    </text>
  </svg>
);

/** 26. Group Large Icon: Bracket with plus sign */
export const GroupLargeIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <rect x="6" y="5" width="10" height="18" rx="1" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
    <line x1="6" y1="10" x2="16" y2="10" stroke="var(--border-strong)" strokeWidth="1" />
    <line x1="6" y1="15" x2="16" y2="15" stroke="var(--border-strong)" strokeWidth="1" />
    {/* Bracket with plus */}
    <path d="M19 6H21V22H19" stroke="var(--fl-accent)" strokeWidth="1.4" fill="none" />
    <circle cx="21" cy="14" r="3" fill="var(--bg-surface)" stroke="var(--fl-accent)" strokeWidth="1" />
    <path d="M19.5 14H22.5M21 12.5V15.5" stroke="var(--fl-accent)" strokeWidth="1" />
  </svg>
);

/** 27. Ungroup Large Icon: Bracket with minus sign */
export const UngroupLargeIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <rect x="6" y="5" width="10" height="18" rx="1" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
    <line x1="6" y1="10" x2="16" y2="10" stroke="var(--border-strong)" strokeWidth="1" />
    <line x1="6" y1="15" x2="16" y2="15" stroke="var(--border-strong)" strokeWidth="1" />
    {/* Bracket with minus */}
    <path d="M19 6H21V22H19" stroke="#d83b01" strokeWidth="1.4" fill="none" />
    <circle cx="21" cy="14" r="3" fill="var(--bg-surface)" stroke="#d83b01" strokeWidth="1" />
    <line x1="19.5" y1="14" x2="22.5" y2="14" stroke="#d83b01" strokeWidth="1" />
  </svg>
);

/** 28. Subtotal Large Icon: Spreadsheet table with subtotal summation row */
export const SubtotalLargeIcon: React.FC<IconProps> = ({ size = 28, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} style={style}>
    <rect x="4" y="5" width="20" height="18" rx="1.5" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1.2" />
    <line x1="4" y1="10" x2="24" y2="10" stroke="var(--border-strong)" strokeWidth="1" />
    <line x1="4" y1="15" x2="24" y2="15" stroke="var(--fl-accent)" strokeWidth="1.2" />
    <line x1="11" y1="5" x2="11" y2="23" stroke="var(--border-strong)" strokeWidth="1" />
    {/* Sigma sum symbol on the subtotal row */}
    <text x="6" y="20" fontFamily="'Segoe UI', sans-serif" fontSize="7" fontWeight="bold" fill="var(--fl-accent)">
      ∑
    </text>
  </svg>
);

/** 29. Show Detail small icon (+ sign) */
export const ShowDetailSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <rect x="2" y="2" width="12" height="12" rx="1" fill="var(--bg-surface)" stroke="var(--fl-accent)" strokeWidth="1" />
    <line x1="8" y1="4.5" x2="8" y2="11.5" stroke="var(--fl-accent)" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="var(--fl-accent)" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/** 30. Hide Detail small icon (- sign) */
export const HideDetailSmallIcon: React.FC<IconProps> = ({ size = 14, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={style}>
    <rect x="2" y="2" width="12" height="12" rx="1" fill="var(--bg-surface)" stroke="currentColor" strokeWidth="1" />
    <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
