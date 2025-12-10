import { useEffect, useRef, useState } from 'react';

interface CalcomBookingProps {
  calLink: string;
  config?: {
    theme?: 'light' | 'dark';
    layout?: 'month_view' | 'column_view' | 'week_view';
    hideEventTypeDetails?: boolean;
    hideBranding?: boolean;
  };
  className?: string;
}

declare global {
  interface Window {
    Cal?: any;
  }
}

export default function CalcomBooking({ calLink, config, className = '' }: CalcomBookingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load the Cal.com script dynamically
    const script = document.createElement('script');
    script.src = 'https://app.cal.com/embed/embed.js';
    script.async = true;

    script.onload = () => {
      if (window.Cal && containerRef.current) {
        window.Cal('init', { origin: 'https://app.cal.com' });

        // Configure UI with Swiss Orange theme
        window.Cal('ui', {
          theme: config?.theme || 'light',
          cssVarsPerTheme: {
            light: {
              'cal-bg': '#ffffff',
              'cal-bg-emphasis': '#f9fafb',
              'cal-text': '#111827',
              'cal-text-emphasis': '#111827',
              'cal-text-default': '#374151',
              'cal-text-subtle': '#6b7280',
              'cal-text-inverted': '#ffffff',
              'cal-bg-inverted': '#111827',
              'cal-border': '#e5e7eb',
              'cal-border-emphasis': '#d1d5db',
              'cal-border-subtle': '#f3f4f6',
              'cal-brand': '#FF4F00',
              'cal-brand-emphasis': '#e64600',
              'cal-brand-text': '#ffffff',
            },
            dark: {
              'cal-bg': '#0a0a0a',
              'cal-bg-emphasis': '#1a1a1a',
              'cal-text': '#ffffff',
              'cal-text-emphasis': '#ffffff',
              'cal-text-default': '#e5e5e5',
              'cal-text-subtle': '#a3a3a3',
              'cal-text-inverted': '#000000',
              'cal-bg-inverted': '#ffffff',
              'cal-border': '#2a2a2a',
              'cal-border-emphasis': '#3a3a3a',
              'cal-border-subtle': '#1a1a1a',
              'cal-brand': '#FF4F00',
              'cal-brand-emphasis': '#e64600',
              'cal-brand-text': '#ffffff',
            }
          }
        });

        // Inline embed
        window.Cal('inline', {
          elementOrSelector: containerRef.current,
          calLink: calLink,
          config: {
            layout: config?.layout || 'month_view',
            theme: config?.theme || 'light',
            hideEventTypeDetails: config?.hideEventTypeDetails || false,
            hideBranding: config?.hideBranding || false,
          }
        });

        setIsLoading(false);
      }
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [calLink, config]);

  return (
    <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-swiss-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-mono text-sm">Kalender wird geladen...</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="cal-inline-container"
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      />
    </div>
  );
}
