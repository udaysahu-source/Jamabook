// src/lib/csv.ts

/**
 * Sanitizes a single CSV cell to prevent CSV / Spreadsheet formula injection (CWE-1236).
 * Any cell starting with =, +, -, @, tab, or carriage return is prefixed with a single quote.
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // Dangerous prefix characters in Excel, Sheets, Calc
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // Escape existing double quotes by doubling them
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports data objects into a securely sanitized CSV string.
 */
export function generateCsv<T extends Record<string, any>>(
  columns: { key: keyof T | string; label: string }[],
  data: T[]
): string {
  const headerRow = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');
  const dataRows = data.map((row) =>
    columns.map((col) => sanitizeCsvCell(row[col.key as keyof T])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}
