import { API_URL, FETCH_DEADLINE_MS, RATES } from './config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch the API, retrying with backoff until FETCH_DEADLINE_MS runs out.
// The server sleeps on Render's free plan and can take ~1 minute to wake.
export async function fetchLatest({ url = API_URL, deadlineMs = FETCH_DEADLINE_MS } = {}) {
  const end = Date.now() + deadlineMs;
  let wait = 5000;
  let attempt = 0;
  let lastError;
  while (Date.now() < end) {
    attempt += 1;
    const timeout = Math.max(5000, Math.min(60000, end - Date.now()));
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeout),
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      const left = end - Date.now();
      console.log(`Fetch attempt ${attempt} failed (${err.message}).`);
      if (left <= 0) break;
      const pause = Math.min(wait, left);
      console.log(`Retrying in ${Math.round(pause / 1000)}s...`);
      await sleep(pause);
      wait = Math.min(wait * 2, 30000);
    }
  }
  throw new Error(`Could not fetch rates after ${attempt} attempts: ${lastError?.message}`);
}

// Turn a value (number or numeric string) into a positive number, or throw.
export function toPositiveNumber(raw, code) {
  let n = NaN;
  if (typeof raw === 'number') n = raw;
  else if (typeof raw === 'string' && /^\s*\d+(\.\d+)?\s*$/.test(raw)) n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid value for ${code}: ${JSON.stringify(raw)}`);
  }
  return n;
}

// Pick and validate the rates we post. Throws if any one is missing or bad,
// so nothing is posted with incomplete data.
export function extractRates(json) {
  const rates = json?.rates;
  if (!rates || typeof rates !== 'object') throw new Error('Response has no "rates" object');
  const out = {};
  for (const { code } of RATES) {
    const entry = rates[code];
    if (!entry || typeof entry !== 'object') throw new Error(`Missing rate: ${code}`);
    out[code] = {
      value: toPositiveNumber(entry.value, code),
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : null,
    };
  }
  return out;
}
