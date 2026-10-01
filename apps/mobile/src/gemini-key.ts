// Safe loader for Gemini API key (Git-safe, no secrets tracked in Git)
let key = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const local = require('./gemini-key.local.json');
  if (local?.key) key = local.key;
} catch {}

export const GEMINI_API_KEY: string = key;
