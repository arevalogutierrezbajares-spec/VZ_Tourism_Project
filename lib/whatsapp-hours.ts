import type { WaWorkingHours } from '@/types/database';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function isWithinWorkingHours(config: {
  working_hours_enabled?: boolean;
  working_hours?: WaWorkingHours | null;
}): boolean {
  if (!config.working_hours_enabled || !config.working_hours) return true;

  const now = new Date();
  // Venezuela is UTC-4
  const vzNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const dayKey = DAY_KEYS[vzNow.getUTCDay()];
  const dayConfig = config.working_hours[dayKey];

  if (!dayConfig?.active) return false;

  const currentTime = `${String(vzNow.getUTCHours()).padStart(2, '0')}:${String(vzNow.getUTCMinutes()).padStart(2, '0')}`;
  return currentTime >= dayConfig.start && currentTime <= dayConfig.end;
}
