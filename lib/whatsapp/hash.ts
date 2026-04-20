import crypto from 'crypto';

/** SHA-256 hash — used for verify_token storage and comparison. */
export const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');
