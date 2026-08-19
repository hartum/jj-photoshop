/**
 * Formatea un número como moneda USD (ej. $1,250).
 * Maneja valores nulos, undefined o NaN retornando "$0".
 */
export function formatCurrency(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '$0'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val)
}
