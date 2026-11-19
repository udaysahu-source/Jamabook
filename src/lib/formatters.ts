// src/lib/formatters.ts
import type { RateUnit } from '../types/index.ts';

/**
 * Format numbers using the Indian numbering system: ₹1,65,800
 */
export function formatCurrency(amount: number, showDecimals: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return formatted;
}

/**
 * Format plain Indian number with commas: 1,65,800 or 1,500
 */
export function formatIndianNumber(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Format plain Indian number with two decimals: 1,23,456.00
 */
export function formatIndianDecimals(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return '0.00';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Converts numeric amount to Indian English words:
 * e.g. 165800 -> "Indian Rupees One Lakh Sixty-Five Thousand Eight Hundred Only"
 */
export function amountToIndianWords(amount: number, prefix: string = 'Indian Rupees'): string {
  if (!amount || amount === 0) return `${prefix} Zero Only`;

  const singleDigits = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  ];
  const twoDigits = [
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n < 20) return twoDigits[n - 10];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? '-' + singleDigits[unit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) {
      str += singleDigits[hundred] + ' Hundred';
      if (rest > 0) str += ' ';
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  const rounded = Math.round(amount * 100) / 100;
  const wholePart = Math.floor(rounded);
  const paisePart = Math.round((rounded - wholePart) * 100);

  let n = wholePart;
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore');

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) parts.push(convertTwoDigits(lakh) + ' Lakh');

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) parts.push(convertTwoDigits(thousand) + ' Thousand');

  const hundred = n;
  if (hundred > 0) parts.push(convertThreeDigits(hundred));

  let words = prefix + ' ' + parts.join(' ');
  if (paisePart > 0) {
    words += ' and ' + convertTwoDigits(paisePart) + ' Paise';
  }
  words += ' Only';

  return words;
}

/**
 * Rate calculation based on AGENTS.md and SPEC.md
 */
export function calculateLineAmount(
  pieces: number,
  kgPerPiece: number,
  rate: number,
  unit: RateUnit
): number {
  if (!pieces || pieces <= 0 || !rate || rate <= 0) return 0;
  const kg = kgPerPiece || 0;
  
  let val = 0;
  if (unit === 'per_quintal') {
    // 1 quintal = 100 kg
    val = (pieces * kg * rate) / 100;
  } else if (unit === 'per_kg') {
    val = pieces * kg * rate;
  } else if (unit === 'per_piece') {
    val = pieces * rate;
  }

  return Math.round(val * 100) / 100;
}

/**
 * Format date in Indian style: DD/MM/YYYY or 19 Nov 2026
 */
export function formatDate(dateString: string, style: 'short' | 'display' = 'display'): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  if (style === 'short') {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
