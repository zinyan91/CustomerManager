import React from 'react';
import { UI } from '../lib/uiClasses';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-line-strong/30 dark:bg-line-strong/20 rounded ${className}`}
      aria-hidden="true"
    />
  );
};

export const ViewSkeleton: React.FC<{
  title?: string;
  hasKpi?: boolean;
  hasToolbar?: boolean;
  tableRows?: number;
}> = ({ hasKpi = true, hasToolbar = true, tableRows = 6 }) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200" role="status" aria-label="Đang tải dữ liệu...">
      {/* Header bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-line">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 sm:w-64" />
          <Skeleton className="h-3.5 w-72 sm:w-96" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards skeleton */}
      {hasKpi && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className={`${UI.containerCardBg} rounded-xl p-3.5 border border-line space-y-2`}>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Toolbar skeleton */}
      {hasToolbar && (
        <div className={`${UI.containerCardBg} rounded-xl p-3 border border-line flex flex-col sm:flex-row items-center justify-between gap-3`}>
          <Skeleton className="h-8 w-full sm:w-72 rounded-lg" />
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      )}

      {/* Main Table / Content Skeleton */}
      <div className={`${UI.containerCardBg} rounded-xl border border-line overflow-hidden`}>
        {/* Table Header */}
        <div className="bg-panel-muted/60 p-3 border-b border-line flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-line p-2">
          {Array.from({ length: tableRows }).map((_, rIdx) => (
            <div key={rIdx} className="py-3 px-2 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3 flex-1">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-40 sm:w-56" />
                <Skeleton className="h-4 w-24 hidden md:block" />
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28 font-mono" />
                <Skeleton className="h-6 w-14 rounded-md hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className={`${UI.containerCardBg} rounded-xl p-4 border border-line space-y-3`}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-8 w-full rounded" />
          <div className="space-y-1.5 pt-2 border-t border-line">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};
