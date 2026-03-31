'use client';

import { Mountain, Shield, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMapStore } from '@/stores/map-store';
import { cn } from '@/lib/utils';

export function MapControls() {
  const { is3DTerrain, isDarkMode, showSafetyZones, toggle3DTerrain, toggleDarkMode, toggleSafetyZones } =
    useMapStore();

  return (
    <TooltipProvider>
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                'w-10 h-10 shadow-md bg-white dark:bg-gray-800 hover:bg-gray-50',
                isDarkMode && 'ring-2 ring-primary'
              )}
              onClick={toggleDarkMode}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                'w-10 h-10 shadow-md bg-white dark:bg-gray-800 hover:bg-gray-50',
                is3DTerrain && 'ring-2 ring-primary'
              )}
              onClick={toggle3DTerrain}
            >
              <Mountain className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">3D Terrain</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                'w-10 h-10 shadow-md bg-white dark:bg-gray-800 hover:bg-gray-50',
                showSafetyZones && 'ring-2 ring-primary'
              )}
              onClick={toggleSafetyZones}
            >
              <Shield className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Safety Zones</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
