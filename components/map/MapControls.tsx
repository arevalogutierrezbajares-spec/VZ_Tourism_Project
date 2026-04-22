'use client';

import { Sun, Moon, Maximize, Minimize } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMapStore } from '@/stores/map-store';
import { cn } from '@/lib/utils';

export function MapControls() {
  const { isDarkMode, toggleDarkMode } = useMapStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  return (
    <TooltipProvider>
      <div
        className="absolute top-4 right-4 flex flex-col gap-2 z-10"
        role="toolbar"
        aria-label="Map controls"
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  'w-11 h-11 shadow-md bg-background hover:bg-muted/50 transition-[background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isDarkMode && 'ring-2 ring-primary'
                )}
                onClick={toggleDarkMode}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={isDarkMode}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            }
          />
          <TooltipContent side="left">
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="secondary"
                size="icon"
                className="w-11 h-11 shadow-md bg-background hover:bg-muted/50 transition-[background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            }
          />
          <TooltipContent side="left">
            {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
