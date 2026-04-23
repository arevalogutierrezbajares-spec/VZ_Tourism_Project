/**
 * @jest-environment node
 *
 * Tests for WhatsApp media download/storage utilities.
 *
 * Coverage:
 *   1. mimeToExt — maps MIME types to extensions
 *   2. getMediaUrl — fetches download URL from Meta
 *   3. parseWebhookPayload — extracts mediaId from image/audio messages
 *   4. parseWebhookPayload — returns no mediaId for text messages
 */

import { mimeToExt, getMediaUrl } from '@/lib/whatsapp-media';
import { parseWebhookPayload } from '@/lib/whatsapp-api';

// ─── mimeToExt ──────────────────────────────────────────────────────────────

describe('mimeToExt', () => {
  it('maps image/jpeg to jpg', () => {
    expect(mimeToExt('image/jpeg')).toBe('jpg');
  });

  it('maps image/png to png', () => {
    expect(mimeToExt('image/png')).toBe('png');
  });

  it('maps image/webp to webp', () => {
    expect(mimeToExt('image/webp')).toBe('webp');
  });

  it('maps audio/ogg to ogg', () => {
    expect(mimeToExt('audio/ogg')).toBe('ogg');
  });

  it('maps audio/mpeg to mp3', () => {
    expect(mimeToExt('audio/mpeg')).toBe('mp3');
  });

  it('maps audio/opus to opus', () => {
    expect(mimeToExt('audio/opus')).toBe('opus');
  });

  it('maps video/mp4 to mp4', () => {
    expect(mimeToExt('video/mp4')).toBe('mp4');
  });

  it('maps application/pdf to pdf', () => {
    expect(mimeToExt('application/pdf')).toBe('pdf');
  });

  it('returns bin for unknown mime type', () => {
    expect(mimeToExt('application/x-unknown')).toBe('bin');
  });

  it('returns bin for empty string', () => {
    expect(mimeToExt('')).toBe('bin');
  });
});

// ─── getMediaUrl ────────────────────────────────────────────────────────────

describe('getMediaUrl', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the url field from Meta response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://lookaside.fbsbx.com/media-download/abc123' }),
    }) as jest.Mock;

    const url = await getMediaUrl('media-123', 'tok_test');
    expect(url).toBe('https://lookaside.fbsbx.com/media-download/abc123');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v21.0/media-123',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok_test' },
      })
    );
  });

  it('throws when Meta returns non-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    }) as jest.Mock;

    await expect(getMediaUrl('media-bad', 'tok_test')).rejects.toThrow('Meta media lookup failed');
  });

  it('throws when response has no url field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'media-123' }),
    }) as jest.Mock;

    await expect(getMediaUrl('media-123', 'tok_test')).rejects.toThrow('missing url field');
  });
});

// ─── parseWebhookPayload — media extraction ────────────────────────────────

function makePayload(msgOverrides: Record<string, unknown>) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          metadata: { phone_number_id: 'pn-001' },
          contacts: [{ wa_id: '584141234567', profile: { name: 'Test Guest' } }],
          messages: [{
            from: '584141234567',
            id: 'wamid.abc123',
            timestamp: '1700000000',
            ...msgOverrides,
          }],
        },
      }],
    }],
  };
}

describe('parseWebhookPayload — media fields', () => {
  it('extracts mediaId and mediaMimeType from an image message', () => {
    const payload = makePayload({
      type: 'image',
      image: { id: 'img-media-001', mime_type: 'image/jpeg', sha256: 'abc' },
    });

    const [msg] = parseWebhookPayload(payload);
    expect(msg).toBeDefined();
    expect(msg!.mediaId).toBe('img-media-001');
    expect(msg!.mediaMimeType).toBe('image/jpeg');
    expect(msg!.messageType).toBe('image');
  });

  it('extracts mediaId and mediaMimeType from an audio message', () => {
    const payload = makePayload({
      type: 'audio',
      audio: { id: 'aud-media-002', mime_type: 'audio/ogg; codecs=opus', sha256: 'def' },
    });

    const [msg] = parseWebhookPayload(payload);
    expect(msg).toBeDefined();
    expect(msg!.mediaId).toBe('aud-media-002');
    expect(msg!.mediaMimeType).toBe('audio/ogg; codecs=opus');
    expect(msg!.messageType).toBe('audio');
  });

  it('extracts mediaId from a video message', () => {
    const payload = makePayload({
      type: 'video',
      video: { id: 'vid-media-003', mime_type: 'video/mp4' },
    });

    const [msg] = parseWebhookPayload(payload);
    expect(msg!.mediaId).toBe('vid-media-003');
    expect(msg!.mediaMimeType).toBe('video/mp4');
  });

  it('extracts mediaId from a document message', () => {
    const payload = makePayload({
      type: 'document',
      document: { id: 'doc-media-004', mime_type: 'application/pdf', filename: 'receipt.pdf' },
    });

    const [msg] = parseWebhookPayload(payload);
    expect(msg!.mediaId).toBe('doc-media-004');
    expect(msg!.mediaMimeType).toBe('application/pdf');
  });

  it('extracts mediaId from a sticker message', () => {
    const payload = makePayload({
      type: 'sticker',
      sticker: { id: 'stk-media-005', mime_type: 'image/webp' },
    });

    const [msg] = parseWebhookPayload(payload);
    expect(msg!.mediaId).toBe('stk-media-005');
    expect(msg!.mediaMimeType).toBe('image/webp');
  });

  it('returns no mediaId for a text message', () => {
    const payload = makePayload({
      type: 'text',
      text: { body: 'Hello, I need a room' },
    });

    const [msg] = parseWebhookPayload(payload);
    expect(msg).toBeDefined();
    expect(msg!.mediaId).toBeUndefined();
    expect(msg!.mediaMimeType).toBeUndefined();
    expect(msg!.messageType).toBe('text');
    expect(msg!.body).toBe('Hello, I need a room');
  });

  it('returns no mediaId for a location message (no media object)', () => {
    const payload = makePayload({
      type: 'location',
      location: { latitude: 10.5, longitude: -66.9 },
    });

    const [msg] = parseWebhookPayload(payload);
    expect(msg).toBeDefined();
    expect(msg!.mediaId).toBeUndefined();
    expect(msg!.mediaMimeType).toBeUndefined();
    expect(msg!.messageType).toBe('location');
  });
});
