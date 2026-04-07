import {
  type RutaRideStatus,
  RUTA_VALID_TRANSITIONS,
  RUTA_TERMINAL_STATUSES,
} from '@/types/ruta'

export class InvalidTransitionError extends Error {
  constructor(from: RutaRideStatus, to: RutaRideStatus) {
    super(`Invalid ride status transition: ${from} -> ${to}`)
    this.name = 'InvalidTransitionError'
  }
}

export function isValidTransition(
  from: RutaRideStatus,
  to: RutaRideStatus
): boolean {
  const allowed = RUTA_VALID_TRANSITIONS[from]
  return allowed.includes(to)
}

export function isTerminalStatus(status: RutaRideStatus): boolean {
  return RUTA_TERMINAL_STATUSES.includes(status)
}

export function validateTransition(
  from: RutaRideStatus,
  to: RutaRideStatus
): void {
  if (!isValidTransition(from, to)) {
    throw new InvalidTransitionError(from, to)
  }
}

// Who can trigger each transition
export type TransitionActor = 'passenger' | 'dispatcher' | 'driver' | 'system'

const TRANSITION_ACTORS: Record<string, TransitionActor[]> = {
  'requested->pending_payment': ['system'],
  'pending_payment->confirmed': ['system'], // Stripe webhook or dispatcher (Zelle)
  'pending_payment->payment_expired': ['system'], // Cron job
  'pending_payment->cancelled_by_passenger': ['passenger'],
  'pending_payment->cancelled_by_ops': ['dispatcher'],
  'confirmed->assigned': ['dispatcher'],
  'confirmed->cancelled_by_passenger': ['passenger'],
  'confirmed->cancelled_by_ops': ['dispatcher'],
  'assigned->driver_en_route': ['driver', 'dispatcher'],
  'assigned->cancelled_by_passenger': ['passenger'],
  'assigned->cancelled_by_ops': ['dispatcher'],
  'driver_en_route->pickup': ['driver', 'dispatcher'],
  'driver_en_route->cancelled_by_ops': ['dispatcher'],
  'pickup->in_progress': ['driver', 'dispatcher'],
  'pickup->cancelled_by_ops': ['dispatcher'],
  'in_progress->completed': ['driver', 'dispatcher'],
  'in_progress->cancelled_by_ops': ['dispatcher'],
}

export function canActorTransition(
  from: RutaRideStatus,
  to: RutaRideStatus,
  actor: TransitionActor
): boolean {
  if (!isValidTransition(from, to)) return false
  const key = `${from}->${to}`
  const allowedActors = TRANSITION_ACTORS[key]
  return allowedActors ? allowedActors.includes(actor) : false
}

// Notifications triggered by status changes
export type NotificationType =
  | 'booking_confirmed'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'ride_completed'
  | 'ride_cancelled'
  | 'payment_expired'

export function getNotificationsForTransition(
  to: RutaRideStatus
): NotificationType[] {
  switch (to) {
    case 'confirmed':
      return ['booking_confirmed']
    case 'assigned':
      return ['driver_assigned']
    case 'driver_en_route':
      return ['driver_en_route']
    case 'completed':
      return ['ride_completed']
    case 'cancelled_by_passenger':
    case 'cancelled_by_ops':
      return ['ride_cancelled']
    case 'payment_expired':
      return ['payment_expired']
    default:
      return []
  }
}
