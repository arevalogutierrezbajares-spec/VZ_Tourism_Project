/** PMS Domain Types — mirrors Posada PMS API response shapes */

export type ReservationState =
  | 'draft'
  | 'pending_payment'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export type ReservationChannel =
  | 'whatsapp'
  | 'walk_in'
  | 'web_dashboard'
  | 'vz_explorer'
  | 'phone'
  | 'email';

export type PaymentMethod =
  | 'zelle'
  | 'pago_movil'
  | 'usdt'
  | 'usd_cash'
  | 'bolivares'
  | 'platform';

export type PaymentStatus = 'pending' | 'matched' | 'unmatched' | 'reversed';

export type TenantRole = 'owner' | 'front_desk' | 'housekeeper';

export type UnitStatus = 'active' | 'maintenance' | 'retired';

export interface PmsUser {
  id: string;
  email: string;
  name: string;
  defaultPropertyId?: string;
}

export interface PmsProperty {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string | null;
  email: string | null;
  igtf_enabled: boolean;
  igtf_mode: 'additional' | 'inclusive';
  onboarding_step: number;
  onboarding_completed: boolean;
}

export interface PropertyMembership {
  id: string;
  name: string;
  role: TenantRole;
}

export interface UnitType {
  id: string;
  name: string;
  base_rate_cents: number;
  max_adults: number;
  max_children: number;
  amenities: string[];
}

export interface Unit {
  id: string;
  unit_type_id: string;
  name: string;
  floor: string | null;
  status: UnitStatus;
  sort_order: number;
}

export interface Guest {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  nationality: string | null;
  tags: string[];
  notes: string;
  total_stays: number;
  total_spend_cents: number;
}

export interface Reservation {
  id: string;
  confirmation_code: string;
  guest_id: string;
  guest_name?: string;
  unit_type_id: string;
  unit_id: string | null;
  room_label?: string;
  state: ReservationState;
  channel: ReservationChannel;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  notes: string | null;
  version: number;
  created_at: string;
}

export interface MatchCandidate {
  reservation_id: string;
  confirmation_code: string;
  guest_name: string;
  confidence: number;
}

export interface Payment {
  id: string;
  amount_cents: number;
  original_amount_cents: number;
  currency: string;
  original_currency: string;
  method: PaymentMethod;
  sender_name: string;
  sender_phone: string | null;
  reference: string | null;
  status: PaymentStatus;
  match_confidence: number | null;
  match_tier: string | null;
  reservation_id: string | null;
  created_at: string;
  match_candidates?: MatchCandidate[];
}

export interface FolioLineItem {
  id: string;
  type: 'charge' | 'payment';
  category: 'room' | 'extra' | 'tax_igtf' | 'discount' | 'fee' | 'payment';
  description: string;
  amount_cents: number;
  original_currency: string;
  created_at: string;
  voided_at: string | null;
}

export interface Folio {
  id: string;
  reservation_id: string;
  line_items: FolioLineItem[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

// State label/color mappings
export const RESERVATION_STATE_CONFIG: Record<
  ReservationState,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: 'Borrador', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  pending_payment: { label: 'Pago pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  confirmed: { label: 'Confirmada', color: 'text-green-700', bgColor: 'bg-green-100' },
  checked_in: { label: 'Check-in', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  checked_out: { label: 'Check-out', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  cancelled: { label: 'Cancelada', color: 'text-red-700', bgColor: 'bg-red-100' },
  no_show: { label: 'No show', color: 'text-orange-700', bgColor: 'bg-orange-100' },
};

export const CHANNEL_LABELS: Record<ReservationChannel, string> = {
  whatsapp: 'WhatsApp',
  walk_in: 'Walk-in',
  web_dashboard: 'Dashboard',
  vz_explorer: 'VAV Platform',
  phone: 'Teléfono',
  email: 'Email',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  zelle: 'Zelle',
  pago_movil: 'Pago Móvil',
  usdt: 'USDT',
  usd_cash: 'Efectivo USD',
  bolivares: 'Bolívares',
  platform: 'Plataforma',
};
