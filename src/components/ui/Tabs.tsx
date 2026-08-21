import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';

export const Tabs = RadixTabs.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof RadixTabs.List>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className = '', ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={`inline-flex items-center gap-1 p-1 rounded-[var(--r-control)] bg-surface/80 border border-line/70 text-ink-muted shadow-2xs ${className}`}
    {...props}
  />
));
TabsList.displayName = RadixTabs.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className = '', ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-[calc(var(--r-control)-2px)] transition-all select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 text-ink-muted hover:text-ink data-[state=active]:bg-panel data-[state=active]:text-accent data-[state=active]:shadow-xs ${className}`}
    {...props}
  />
));
TabsTrigger.displayName = RadixTabs.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className = '', ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={`outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all ${className}`}
    {...props}
  />
));
TabsContent.displayName = RadixTabs.Content.displayName;
