import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRates, toPositiveNumber } from '../src/rates.js';
import { round2, formatValue, formatDateTime, westernDigits } from '../src/format.js';
import { directions, hasChanged } from '../src/state.js';
import { buildCaption } from '../src/caption.js';

const api = (o = {}) => ({
  rates: {
    USD: { value: 10.46, updatedAt: 'x' },
    EUR: { value: '11.45', updatedAt: 'x' },
    GBP: { value: 13.4, updatedAt: 'x' },
    GOLD_18K_NEW: { value: 1200, updatedAt: 'x' },
    ...o,
  },
});

test('accepts numbers and numeric strings', () => {
  const r = extractRates(api());
  assert.equal(r.EUR.value, 11.45);
  assert.equal(r.GOLD_18K_NEW.value, 1200);
});

test('rejects missing, zero, negative and junk values', () => {
  assert.throws(() => extractRates(api({ USD: undefined })), /Missing rate: USD/);
  assert.throws(() => extractRates(api({ GBP: { value: 0 } })), /Invalid/);
  assert.throws(() => extractRates(api({ GBP: { value: -3 } })), /Invalid/);
  assert.throws(() => extractRates(api({ GBP: { value: 'abc' } })), /Invalid/);
  assert.throws(() => extractRates(api({ GBP: { value: null } })), /Invalid/);
  assert.throws(() => extractRates({}), /no "rates"/);
  assert.throws(() => toPositiveNumber(Infinity, 'X'), /Invalid/);
});

test('rounding and formatting', () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(11.455), 11.46);
  assert.equal(formatValue(1200), '1,200.00');
  assert.equal(formatValue(10.46), '10.46');
  assert.equal(westernDigits('٠١٢٣٤٥٦٧٨٩ ۰۹'), '0123456789 09');
});

test('date/time in Libya time with Western digits', () => {
  const { date, time } = formatDateTime(new Date('2026-11-16T13:05:00Z'));
  assert.match(date, /16\/11\/2026$/);
  assert.equal(time, '3:05 م');
  assert.doesNotMatch(date + time, /[٠-٩]/);
});

test('change detection and arrows', () => {
  const r = extractRates(api());
  assert.equal(hasChanged(r, null), true);
  const same = { values: { USD: 10.46, EUR: 11.45, GBP: 13.4, GOLD_18K_NEW: 1200 } };
  assert.equal(hasChanged(r, same), false);
  const tiny = { values: { ...same.values, USD: 10.461 } };
  assert.equal(hasChanged(r, tiny), false, 'compares at 2 decimals');
  const d = directions(r, { values: { ...same.values, USD: 10.5, GBP: 13.1 } });
  assert.deepEqual(d, { USD: 'down', EUR: null, GBP: 'up', GOLD_18K_NEW: null });
});

test('caption with and without app link', () => {
  const r = extractRates(api());
  const when = { date: 'الاثنين 16/11/2026', time: '3:05 م' };
  const c = buildCaption(r, when, '');
  assert.equal(c.split('\n').length, 6);
  assert.match(c, /الذهب عيار 18: 1,200.00 دينار للغرام/);
  assert.equal(buildCaption(r, when, 'https://play.google.com/x').split('\n').length, 7);
});
