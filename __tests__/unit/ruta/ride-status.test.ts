import {
  isValidTransition,
  isTerminalStatus,
  validateTransition,
  InvalidTransitionError,
  canActorTransition,
  getNotificationsForTransition,
} from '@/lib/ruta/ride-status'
import { RUTA_VALID_TRANSITIONS, RUTA_TERMINAL_STATUSES } from '@/types/ruta'
import type { RutaRideStatus } from '@/types/ruta'

describe('ride-status', () => {
  describe('isValidTransition', () => {
    it('allows requested → pending_payment', () => {
      expect(isValidTransition('requested', 'pending_payment')).toBe(true)
    })

    it('allows pending_payment → confirmed', () => {
      expect(isValidTransition('pending_payment', 'confirmed')).toBe(true)
    })

    it('allows confirmed → assigned', () => {
      expect(isValidTransition('confirmed', 'assigned')).toBe(true)
    })

    it('allows the full happy path', () => {
      const happyPath: RutaRideStatus[] = [
        'requested', 'pending_payment', 'confirmed', 'assigned',
        'driver_en_route', 'pickup', 'in_progress', 'completed',
      ]
      for (let i = 0; i < happyPath.length - 1; i++) {
        expect(isValidTransition(happyPath[i], happyPath[i + 1])).toBe(true)
      }
    })

    it('rejects invalid transitions', () => {
      expect(isValidTransition('requested', 'completed')).toBe(false)
      expect(isValidTransition('completed', 'requested')).toBe(false)
      expect(isValidTransition('in_progress', 'assigned')).toBe(false)
    })

    it('allows cancellation from pre-completion states', () => {
      expect(isValidTransition('requested', 'cancelled_by_ops')).toBe(true)
      expect(isValidTransition('pending_payment', 'cancelled_by_passenger')).toBe(true)
      expect(isValidTransition('confirmed', 'cancelled_by_passenger')).toBe(true)
      expect(isValidTransition('in_progress', 'cancelled_by_ops')).toBe(true)
    })

    it('disallows passenger cancellation after driver_en_route', () => {
      expect(isValidTransition('driver_en_route', 'cancelled_by_passenger')).toBe(false)
      expect(isValidTransition('pickup', 'cancelled_by_passenger')).toBe(false)
      expect(isValidTransition('in_progress', 'cancelled_by_passenger')).toBe(false)
    })
  })

  describe('isTerminalStatus', () => {
    it('identifies terminal statuses', () => {
      expect(isTerminalStatus('completed')).toBe(true)
      expect(isTerminalStatus('cancelled_by_passenger')).toBe(true)
      expect(isTerminalStatus('cancelled_by_ops')).toBe(true)
      expect(isTerminalStatus('payment_expired')).toBe(true)
    })

    it('identifies non-terminal statuses', () => {
      expect(isTerminalStatus('requested')).toBe(false)
      expect(isTerminalStatus('confirmed')).toBe(false)
      expect(isTerminalStatus('in_progress')).toBe(false)
    })

    it('terminal statuses have no valid transitions', () => {
      for (const status of RUTA_TERMINAL_STATUSES) {
        expect(RUTA_VALID_TRANSITIONS[status]).toEqual([])
      }
    })
  })

  describe('validateTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => validateTransition('requested', 'pending_payment')).not.toThrow()
    })

    it('throws InvalidTransitionError for invalid transitions', () => {
      expect(() => validateTransition('completed', 'requested')).toThrow(InvalidTransitionError)
    })
  })

  describe('canActorTransition', () => {
    it('allows system to move requested → pending_payment', () => {
      expect(canActorTransition('requested', 'pending_payment', 'system')).toBe(true)
    })

    it('allows dispatcher to assign confirmed rides', () => {
      expect(canActorTransition('confirmed', 'assigned', 'dispatcher')).toBe(true)
    })

    it('allows passenger to cancel pending_payment', () => {
      expect(canActorTransition('pending_payment', 'cancelled_by_passenger', 'passenger')).toBe(true)
    })

    it('disallows passenger from assigning drivers', () => {
      expect(canActorTransition('confirmed', 'assigned', 'passenger')).toBe(false)
    })

    it('returns false for invalid transition regardless of actor', () => {
      expect(canActorTransition('completed', 'requested', 'dispatcher')).toBe(false)
    })
  })

  describe('getNotificationsForTransition', () => {
    it('returns booking_confirmed for confirmed', () => {
      expect(getNotificationsForTransition('confirmed')).toEqual(['booking_confirmed'])
    })

    it('returns ride_completed for completed', () => {
      expect(getNotificationsForTransition('completed')).toEqual(['ride_completed'])
    })

    it('returns ride_cancelled for cancellation statuses', () => {
      expect(getNotificationsForTransition('cancelled_by_passenger')).toEqual(['ride_cancelled'])
      expect(getNotificationsForTransition('cancelled_by_ops')).toEqual(['ride_cancelled'])
    })

    it('returns empty for non-notification statuses', () => {
      expect(getNotificationsForTransition('requested')).toEqual([])
      expect(getNotificationsForTransition('pending_payment')).toEqual([])
    })
  })
})
