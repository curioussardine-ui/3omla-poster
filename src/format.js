import { TIME_ZONE } from './config.js';

// Round half up to 2 decimals using the decimal text, so 1.005 -> 1.01
// (plain toFixed would give 1.00 because of binary floating point).
export function round2(n) {
  return Number(`${Math.round(Number(`${n}e2`))}e-2`);
}

const ARABIC_INDIC = /[٠-٩۰-۹]/g;

// Replace any Arabic-Indic or Persian digits with Western ones. Used as a
// final safety net: every digit we output must be 0-9.
export function westernDigits(s) {
  return s.replace(ARABIC_INDIC, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

export function assertWesternDigits(s) {
  if (ARABIC_INDIC.test(s)) throw new Error('Arabic-Indic digits found in output');
  ARABIC_INDIC.lastIndex = 0;
}

const numberFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// 1200 -> "1,200.00"
export function formatValue(n) {
  return numberFmt.format(round2(n));
}

// Date and time in Libya, Arabic words, Western digits.
// Example: { date: "الاثنين 16/11/2026", time: "3:13 م" }
export function formatDateTime(when = new Date()) {
  const weekday = new Intl.DateTimeFormat('ar-LY-u-nu-latn', {
    timeZone: TIME_ZONE,
    weekday: 'long',
  }).format(when);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .formatToParts(when)
      .map((p) => [p.type, p.value]),
  );
  const ampm = parts.dayPeriod.toLowerCase().startsWith('a') ? 'ص' : 'م';
  return {
    date: westernDigits(`${weekday} ${parts.day}/${parts.month}/${parts.year}`),
    time: westernDigits(`${parts.hour}:${parts.minute} ${ampm}`),
  };
}

// The calendar day in Libya as YYYY-MM-DD.
export function libyaDay(when = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(when);
}
