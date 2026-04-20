// Shared STATUS_CONFIG using DESIGN.md OKLCH status tokens
export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-status-pending/10 text-status-pending' },
  confirmed: { label: 'Confirmed', className: 'bg-status-confirmed/10 text-status-confirmed' },
  completed: { label: 'Completed', className: 'bg-status-completed/10 text-status-completed' },
  cancelled: { label: 'Cancelled', className: 'bg-status-cancelled/10 text-status-cancelled' },
  payment_submitted: { label: 'Payment Sent', className: 'bg-status-payment-submitted/10 text-status-payment-submitted' },
};

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
}

// WhatsApp conversation status config (used across whatsapp components)
export const WA_STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  ai:        { label: 'AI',        badge: 'bg-green-100 text-green-800 border-green-200',  dot: 'bg-green-500' },
  human:     { label: 'Human',     badge: 'bg-blue-100 text-blue-800 border-blue-200',     dot: 'bg-blue-500'  },
  escalated: { label: 'Escalated', badge: 'bg-red-100 text-red-800 border-red-200',        dot: 'bg-red-500'   },
  closed:    { label: 'Closed',    badge: 'bg-gray-100 text-gray-500 border-gray-200',     dot: 'bg-gray-400'  },
};
