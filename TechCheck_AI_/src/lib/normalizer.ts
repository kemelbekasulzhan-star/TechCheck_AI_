import type { Parameter } from './schema';

export function numberValue(value: string): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
export function normalize(parameter: Parameter, value: string | null, unit: string | null): string | number | null {
  if (value === null) return null;
  const u = (unit ?? '').trim().toLowerCase();
  if (['rated_power', 'rated_voltage', 'rated_frequency', 'phase_count'].includes(parameter)) {
    const n = numberValue(value);
    if (n === null || n <= 0) return null;
    if (parameter === 'rated_power') return ['квт', 'kw'].includes(u) ? n * 1000 : ['вт', 'w'].includes(u) ? n : null;
    if (parameter === 'rated_voltage') return ['кв', 'kv'].includes(u) ? n * 1000 : ['в', 'v'].includes(u) ? n : null;
    if (parameter === 'rated_frequency') return ['гц', 'hz'].includes(u) ? n : null;
    return u === '' && Number.isInteger(n) ? n : null;
  }
  const clean = value.toUpperCase().replace(/\s/g, '');
  if (parameter === 'ip_code') return /^IP\d{2}$/.test(clean) ? clean : null;
  if (parameter === 'mounting_code') return /^IM(?:B|V)?\d{1,4}$/.test(clean) ? clean : null;
  if (parameter === 'duty_code') return /^S[1-9]$/.test(clean) ? clean : null;
  return value.trim() || null;
}
export function formatValue(value: string | null, unit: string | null): string { return value === null ? 'Не распознано' : `${value}${unit ? ` ${unit}` : ''}`; }
