/**
 * WhatsApp media download and Supabase Storage upload.
 *
 * Flow:
 * 1. GET /{media-id} with access token -> returns { url: "https://..." }
 * 2. GET that URL with access token -> binary data
 * 3. Upload to Supabase Storage bucket 'wa-media'
 * 4. Return public URL
 */

import type { ServiceClient } from '@/types/supabase-client';

const WA_API_VERSION = 'v21.0';
const WA_BASE = `https://graph.facebook.com/${WA_API_VERSION}`;
const MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10 MB
const FETCH_TIMEOUT_MS = 8000;

/**
 * Retrieve the temporary download URL for a WhatsApp media ID.
 */
export async function getMediaUrl(mediaId: string, accessToken: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${WA_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Meta media lookup failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { url?: string };
    if (!data.url) throw new Error('Meta media response missing url field');
    return data.url;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Download media from Meta, upload to Supabase Storage, return public URL.
 * Returns null on any error (non-throwing — safe for fire-and-forget).
 */
export async function downloadAndStoreMedia(opts: {
  mediaId: string;
  accessToken: string;
  supabase: ServiceClient;
  providerId: string;
  conversationId: string;
  messageId: string;
  mimeType: string;
}): Promise<{ publicUrl: string } | null> {
  const { mediaId, accessToken, supabase, providerId, conversationId, messageId, mimeType } = opts;

  try {
    // 1. Get the temporary download URL from Meta
    const downloadUrl = await getMediaUrl(mediaId, accessToken);

    // 2. Download the binary data
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }

    if (!res.ok) {
      throw new Error(`Media download failed (${res.status})`);
    }

    // 3. Check size before reading into memory
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_MEDIA_SIZE) {
      console.warn(`[whatsapp-media] Media too large (${contentLength} bytes), skipping`);
      return null;
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_MEDIA_SIZE) {
      console.warn(`[whatsapp-media] Media too large (${buffer.byteLength} bytes), skipping`);
      return null;
    }

    // 4. Determine file extension from MIME type
    const ext = mimeToExt(mimeType);

    // 5. Upload to Supabase Storage: wa-media/{providerId}/{conversationId}/{messageId}.{ext}
    const storagePath = `${providerId}/${conversationId}/${messageId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('wa-media')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    // 6. Get public URL
    const { data: urlData } = supabase.storage
      .from('wa-media')
      .getPublicUrl(storagePath);

    return { publicUrl: urlData.publicUrl };
  } catch (err) {
    console.warn('[whatsapp-media] downloadAndStoreMedia failed:', err);
    return null;
  }
}

/** Map MIME type to file extension. */
export function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/opus': 'opus',
    'audio/ogg; codecs=opus': 'ogg',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };
  return map[mime] ?? 'bin';
}
