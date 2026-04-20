'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Bot, User, CheckCheck, Circle,
} from 'lucide-react';
import type {
  WaConversation, WaMessage, WaConversationStatus, WaBookingStage,
} from '@/types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<WaBookingStage, { label: string; color: string }> = {
  lead:       { label: 'Lead',       color: 'text-muted-foreground' },
  quoted:     { label: 'Quoted',     color: 'text-yellow-700'       },
  confirmed:  { label: 'Confirmed',  color: 'text-green-700'        },
  checked_in: { label: 'Checked In', color: 'text-blue-700'         },
  closed:     { label: 'Closed',     color: 'text-muted-foreground' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ModeButton({
  active, icon, label, description, onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        active
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-transparent hover:border-border hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn(
          'w-7 h-7 rounded-md flex items-center justify-center',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}>
          {icon}
        </div>
        <div>
          <p className={cn('text-xs font-medium', active ? 'text-primary' : 'text-foreground')}>{label}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
        {active && <Circle className="w-1.5 h-1.5 fill-primary text-primary ml-auto" />}
      </div>
    </button>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface BookingPipelineProps {
  selected: WaConversation & { messages?: WaMessage[] };
  onUpdateStatus: (status: WaConversationStatus) => void;
  onUpdateStage: (stage: WaBookingStage) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BookingPipeline({
  selected,
  onUpdateStatus,
  onUpdateStage,
}: BookingPipelineProps) {
  return (
    <div className="w-52 flex-shrink-0 flex flex-col overflow-y-auto bg-background">
      {/* Mode control */}
      <div className="p-4 border-b">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Handling Mode
        </p>
        <div className="space-y-1.5">
          <ModeButton
            active={selected.status === 'ai'}
            icon={<Bot className="w-3.5 h-3.5" />}
            label="AI"
            description="Auto-replies"
            onClick={() => {
              if (selected.status === 'human') {
                if (!window.confirm('Switch back to AI? This will resume automated responses.')) return;
              }
              onUpdateStatus('ai');
            }}
          />
          <ModeButton
            active={selected.status === 'human'}
            icon={<User className="w-3.5 h-3.5" />}
            label="Take Over"
            description="You're typing"
            onClick={() => onUpdateStatus('human')}
          />
          <ModeButton
            active={selected.status === 'closed'}
            icon={<CheckCheck className="w-3.5 h-3.5" />}
            label="Close"
            description="Done"
            onClick={() => {
              if (!window.confirm('Are you sure? This will close the conversation.')) return;
              onUpdateStatus('closed');
            }}
          />
        </div>
      </div>

      {/* Booking stage */}
      <div className="p-4 border-b">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Booking Stage
        </p>
        <div className="space-y-0.5">
          {(Object.keys(STAGE_CONFIG) as WaBookingStage[]).map((stage) => {
            const active = selected.booking_stage === stage;
            return (
              <button
                key={stage}
                onClick={() => onUpdateStage(stage)}
                className={cn(
                  'w-full text-left text-xs px-2.5 py-2 rounded-md transition-colors flex items-center gap-2',
                  active
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', active ? 'bg-primary-foreground' : 'bg-border')} />
                {STAGE_CONFIG[stage].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Guest info */}
      <div className="p-4 border-b">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Guest
        </p>
        <div className="space-y-1">
          <p className="text-sm font-medium">{selected.guest_name ?? '—'}</p>
          <p className="text-xs text-muted-foreground font-mono">{selected.guest_phone}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Since {new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Quick Actions
        </p>
        <div className="space-y-1.5">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7 justify-start"
            onClick={() => {
              if (selected.status === 'human') {
                if (!window.confirm('Switch back to AI? This will resume automated responses.')) return;
              }
              onUpdateStatus('ai');
            }}
            disabled={selected.status === 'ai'}
          >
            <Bot className="w-3 h-3 mr-1.5" />
            Resume AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7 justify-start text-destructive hover:text-destructive"
            onClick={() => {
              if (!window.confirm('Are you sure? This will close the conversation.')) return;
              onUpdateStage('closed');
            }}
          >
            <CheckCheck className="w-3 h-3 mr-1.5" />
            Mark Closed
          </Button>
        </div>
      </div>
    </div>
  );
}
