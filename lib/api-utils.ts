// Shared input helpers for API routes.

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
export const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5 MB decoded

export function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Parses a data URL or raw base64 image into Gemini inlineData, validating size and type. */
export function parseImage(value: unknown): { mimeType: string; data: string } {
  if (typeof value !== 'string' || !value) throw new InputError('An image is required.');
  if (value.length > MAX_BASE64_LENGTH) throw new InputError('Image is too large. Please use an image under 7 MB.', 413);

  const match = value.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return { mimeType: 'image/jpeg', data: value };

  const detected = match[1].toLowerCase();
  const mimeType = detected === 'image/jpg' ? 'image/jpeg' : detected;
  if (!ALLOWED_MIME.has(mimeType)) throw new InputError('Unsupported image type. Use JPEG, PNG, WebP or GIF.', 415);
  return { mimeType, data: match[2] };
}

/** Parses model output that should be JSON, tolerating ```json fences. */
export function parseModelJson(rawText: string | undefined): any {
  const text = rawText?.trim() || '{}';
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  }
}
