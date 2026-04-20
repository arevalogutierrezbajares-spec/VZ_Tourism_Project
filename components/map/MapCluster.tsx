'use client';

interface Props {
  count: number;
  onClick: () => void;
}

export function MapCluster({ count, onClick }: Props) {
  // Min size 44x44px to meet mobile touch target requirements
  const size = count > 50 ? 'w-14 h-14 text-base' : count > 10 ? 'w-12 h-12 text-sm' : 'w-11 h-11 text-xs';

  return (
    <button
      onClick={onClick}
      className={`
        ${size} rounded-full bg-primary text-white font-bold shadow-lg border-4 border-white
        flex items-center justify-center hover:scale-110 transition-transform cursor-pointer
        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
      `}
      aria-label={`Cluster of ${count} ${count === 1 ? 'listing' : 'listings'}. Click to expand.`}
    >
      {count}
    </button>
  );
}
