'use client';

import { cn } from '@/lib/utils';
import type { WaConversation } from '@/types/database';

export interface StatsStripProps {
  conversations: WaConversation[];
}

/**
 * Horizontal 4-column stats bar showing total / AI / human / escalated counts.
 * Used in both the ConversationList sidebar and the provider dashboard messages page.
 */
export default function StatsStrip({ conversations }: StatsStripProps) {
  const counts = {
    total:     conversations.length,
    ai:        conversations.filter((c) => c.status === 'ai').length,
    human:     conversations.filter((c) => c.status === 'human').length,
    escalated: conversations.filter((c) => c.status === 'escalated').length,
  };

  return (
    <div className="grid grid-cols-4 divide-x border-b">
      {[
        { label: 'Total',     value: counts.total,     color: 'text-foreground'        },
        { label: 'AI',        value: counts.ai,        color: 'text-secondary'         },
        { label: 'Human',     value: counts.human,     color: 'text-primary'           },
        { label: 'Escalated', value: counts.escalated, color: 'text-destructive'       },
      ].map(({ label, value, color }) => (
        <div key={label} className="py-2.5 text-center">
          <p className={cn('text-base font-bold', color)}>{value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        </div>
      ))}
    </div>
  );
}
