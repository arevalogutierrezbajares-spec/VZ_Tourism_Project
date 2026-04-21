'use client';

import { Mountain, Shield, Sun, Moon, Maximize, Minimize } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMapStore } from '@/stores/map-store';
import { cn } from '@/lib/utils';

export function MapControls() {
  const { is3DTerrain, isDarkMode, showSafetyZones, toggle3DTerrain, toggleDarkMode, toggleSafetyZones } =
    useMapStore();
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
                className={cn(
                  'w-11 h-11 shadow-md bg-background hover:bg-muted/50 transition-[background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  is3DTerrain && 'ring-2 ring-primary'
                )}
                onClick={toggle3DTerrain}
                aria-label={is3DTerrain ? 'Disable 3D terrain' : 'Enable 3D terrain'}
                aria-pressed={is3DTerrain}
              >
                <Mountain className="w-5 h-5" />
              </Button>
            }
          />
          <TooltipContent side="left">
            {is3DTerrain ? '3D Terrain (on)' : '3D Terrain (off)'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  'w-11 h-11 shadow-md bg-background hover:bg-muted/50 transition-[background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  showSafetyZones && 'ring-2 ring-primary'
                )}
                onClick={toggleSafetyZones}
                aria-label={showSafetyZones ? 'Hide safety zones' : 'Show safety zones'}
                aria-pressed={showSafetyZones}
              >
                <Shield className="w-5 h-5" />
              </Button>
            }
          />
          <TooltipContent side="left">
            {showSafetyZones ? 'Safety Zones (on)' : 'Safety Zones (off)'}
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
