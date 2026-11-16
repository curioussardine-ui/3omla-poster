import { APP_LINK, RATES } from './config.js';
import { assertWesternDigits, formatValue } from './format.js';

export function buildCaption(rates, { date, time }, appLink = APP_LINK) {
  const lines = [`💵 أسعار اليوم في ليبيا — ${date} ${time}`];
  for (const { code, label, perGram } of RATES) {
    lines.push(`${label}: ${formatValue(rates[code].value)} دينار${perGram ? ' للغرام' : ''}`);
  }
  lines.push('📲 احسب أي مبلغ في ثانية مع تطبيق عُملة');
  if (appLink) lines.push(appLink);
  const caption = lines.join('\n');
  assertWesternDigits(caption);
  return caption;
}
