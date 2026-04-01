// Mock uuid to avoid ESM transformation issues
let counter = 0;

export function v4(): string {
  counter++;
  return `test-uuid-${String(counter).padStart(4, '0')}-0000-0000-0000-000000000000`;
}

export const v1 = jest.fn(() => `v1-uuid-${Date.now()}`);
export const v3 = jest.fn(() => 'v3-uuid');
export const v5 = jest.fn(() => 'v5-uuid');
export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
export const validate = jest.fn(() => true);
export const version = jest.fn(() => 4);
export const stringify = jest.fn((bytes: Uint8Array) => bytes.join('-'));
export const parse = jest.fn(() => new Uint8Array(16));

export default { v4, v1, v3, v5, NIL, MAX, validate, version };
