import type { Booking } from '@/types/database';

const RESPOND_IO_API_KEY = process.env.RESPOND_IO_API_KEY!;
const RESPOND_IO_BASE_URL = 'https://api.respond.io/v2';

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template';
  text?: string;
  template?: {
    name: string;
    language: string;
    components: Record<string, unknown>[];
  };
}

async function sendWhatsAppRequest(endpoint: string, body: Record<string, unknown>) {
  const response = await fetch(`${RESPOND_IO_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESPOND_IO_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }

  return response.json();
}

export async function sendMessage(to: string, text: string) {
  return sendWhatsAppRequest('/message', {
    contact: { phone: to },
    message: {
      type: 'text',
      text,
    },
  });
}

export async function sendBookingConfirmation(booking: Booking & {
  listing?: { title: string; location_name: string; meeting_point?: string | null };
  tourist?: { full_name: string; phone?: string | null };
}) {
  if (!booking.tourist?.phone) return null;

  const message = `
✅ *Booking Confirmed!*

Hi ${booking.tourist.full_name}! Your booking has been confirmed.

📍 *${booking.listing?.title}*
📅 Date: ${new Date(booking.check_in).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
👥 Guests: ${booking.guests}
💵 Total: $${booking.total_usd.toFixed(2)} USD

${booking.listing?.meeting_point ? `🗺️ Meeting Point: ${booking.listing.meeting_point}` : `📍 Location: ${booking.listing?.location_name}`}

Booking ID: ${booking.id.slice(0, 8).toUpperCase()}

Need help? Reply to this message or visit our app.

*Venezuela Tourism SuperApp* 🇻🇪
  `.trim();

  return sendMessage(booking.tourist.phone, message);
}

export async function sendBookingCancellation(booking: Booking & {
  listing?: { title: string };
  tourist?: { full_name: string; phone?: string | null };
}) {
  if (!booking.tourist?.phone) return null;

  const message = `
❌ *Booking Cancelled*

Hi ${booking.tourist.full_name}, your booking has been cancelled.

📍 *${booking.listing?.title}*
Booking ID: ${booking.id.slice(0, 8).toUpperCase()}

${booking.refund_amount_usd ? `💰 Refund of $${booking.refund_amount_usd.toFixed(2)} USD will be processed within 5-7 business days.` : ''}

Questions? Reply to this message or contact our support team.

*Venezuela Tourism SuperApp* 🇻🇪
  `.trim();

  return sendMessage(booking.tourist.phone, message);
}

export async function sendProviderNotification(
  providerPhone: string,
  booking: Booking & {
    listing?: { title: string };
    tourist?: { full_name: string; nationality?: string | null };
  }
) {
  const message = `
🔔 *New Booking!*

You have a new booking for *${booking.listing?.title}*

👤 Guest: ${booking.tourist?.full_name}
${booking.tourist?.nationality ? `🌍 From: ${booking.tourist.nationality}` : ''}
📅 Date: ${new Date(booking.check_in).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
👥 Guests: ${booking.guests}
💵 Your earnings: $${booking.provider_amount_usd.toFixed(2)} USD

Booking ID: ${booking.id.slice(0, 8).toUpperCase()}

Log in to your dashboard to manage this booking.

*Venezuela Tourism SuperApp* 🇻🇪
  `.trim();

  return sendMessage(providerPhone, message);
}
