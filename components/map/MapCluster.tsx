'use client';

interface Props {
  count: number;
  onClick: () => void;
}

export function MapCluster({ count, onClick }: Props) {
  const size = count > 50 ? 'w-14 h-14 text-base' : count > 10 ? 'w-11 h-11 text-sm' : 'w-9 h-9 text-xs';

  return (
    <button
      onClick={onClick}
      className={`
        ${size} rounded-full bg-primary text-white font-bold shadow-lg border-4 border-white
        flex items-center justify-center hover:scale-110 transition-transform cursor-pointer
      `}
      aria-label={`${count} listings in this area`}
    >
      {count}
    </button>
  );
}
