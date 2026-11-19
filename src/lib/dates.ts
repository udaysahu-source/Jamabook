// src/lib/dates.ts

/**
 * Returns the current date in Asia/Kolkata timezone as YYYY-MM-DD
 */
export function todayIST(dateInput: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(dateInput);
}

/**
 * Formats a date into Indian standard format: DD-MMM-YYYY (e.g. 19-Nov-2026)
 */
export function formatTallyDateIST(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).formatToParts(d);

    const day = parts.find((p) => p.type === 'day')?.value || '';
    const month = parts.find((p) => p.type === 'month')?.value || '';
    const year = parts.find((p) => p.type === 'year')?.value || '';

    return `${day}-${month}-${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Checks if a date is within an allowable range (between 1 year in past and 1 day in future)
 */
export function isBillDateValid(dateStr: string): boolean {
  try {
    const billDate = new Date(dateStr);
    const now = new Date();
    
    // One day in future buffer
    const maxFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    // One year in past buffer
    const maxPast = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    return billDate <= maxFuture && billDate >= maxPast;
  } catch {
    return false;
  }
}
