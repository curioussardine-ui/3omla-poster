// All settings in one place. No secrets here: the Page ID and token come
// from environment variables (GitHub Secrets).

export const API_URL = 'https://libya-currency-api.onrender.com/api/v1/rates/latest';

// Total time to keep retrying while the Render server wakes up.
export const FETCH_DEADLINE_MS = 2 * 60 * 1000;

// Rates shown, in order. `code` is the key in the API's `rates` object.
export const RATES = [
  { code: 'USD', label: 'الدولار' },
  { code: 'EUR', label: 'اليورو' },
  { code: 'GBP', label: 'الباوند' },
  { code: 'GOLD_18K_NEW', label: 'الذهب عيار 18', perGram: true },
];

export const TIME_ZONE = 'Africa/Tripoli';

// The cron line of the morning run in .github/workflows/post.yml.
// That run always posts, even if no rate changed.
export const MORNING_CRON = '0 7 * * *';

// Google Play link. Leave empty until the app is public: the caption then
// skips the link line.
export const APP_LINK = '';

// Facebook Graph API version (checked against Meta's changelog, Nov 2026).
export const GRAPH_API_VERSION = 'v27.0';

export const STATE_FILE = 'state/last-posted.json';
export const OUT_DIR = 'out';
