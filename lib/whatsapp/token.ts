/**
 * WhatsApp access token decryption helper.
 *
 * Reads from Supabase Vault when available, falls back to the plaintext
 * access_token column. This lets migration 016 be applied before Vault is
 * enabled on Pro plan — the app keeps working with zero downtime.
 *
 * Usage:
 *   const token = await getWhatsAppToken(supabase, config);
 */

// Minimal shape required — both webhook and send routes pass the full config row
export interface WhatsAppTokenRow {
  access_token: string;
  access_token_vault_id: string | null;
}

import type { ServiceClient } from '@/types/supabase-client';

export async function getWhatsAppToken(supabase: ServiceClient, config: WhatsAppTokenRow): Promise<string> {
  if (config.access_token_vault_id) {
    try {
      const { data, error } = await supabase.rpc('vault_read_wa_token', {
        p_vault_id: config.access_token_vault_id,
      });
      if (!error && typeof data === 'string' && data.length > 0) {
        return data;
      }
      // Vault read returned an error or empty — fall through to plaintext
      console.warn('[WhatsApp Token] Vault write failed — token stored in plaintext as fallback. Rotate token and configure Vault for production.');
    } catch {
      // Vault RPC unavailable — fall through to plaintext
      console.warn('[WhatsApp Token] Vault write failed — token stored in plaintext as fallback. Rotate token and configure Vault for production.');
    }
  }
  // Plaintext fallback (pre-Vault or Vault not enabled yet)
  return config.access_token;
}
