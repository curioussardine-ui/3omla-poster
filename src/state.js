import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { RATES, STATE_FILE } from './config.js';
import { round2 } from './format.js';

// Last posted values: { postedAt, values: { USD: 10.46, ... } } or null.
export async function loadState(file = STATE_FILE) {
  try {
    const json = JSON.parse(await readFile(file, 'utf8'));
    return json && typeof json.values === 'object' ? json : null;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function saveState(rates, postInfo, file = STATE_FILE) {
  const values = {};
  for (const { code } of RATES) values[code] = round2(rates[code].value);
  const state = { postedAt: new Date().toISOString(), postId: postInfo?.postId ?? null, values };
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

// 'up' | 'down' | null for each code, compared with the last post.
export function directions(rates, state) {
  const out = {};
  for (const { code } of RATES) {
    const prev = state?.values?.[code];
    const now = round2(rates[code].value);
    if (typeof prev !== 'number') out[code] = null;
    else if (now > round2(prev)) out[code] = 'up';
    else if (now < round2(prev)) out[code] = 'down';
    else out[code] = null;
  }
  return out;
}

export function hasChanged(rates, state) {
  if (!state) return true;
  return Object.values(directions(rates, state)).some((d) => d !== null);
}
