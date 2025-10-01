/**
 * CSV security helpers to prevent formula injection attacks
 * Ensures exported CSV files are safe to open in spreadsheet software
 */
export function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Characters that can start a malicious formula in Excel or Google Sheets
  const formulaStarters = ['=', '+', '-', '@', '\t', '\r'];

  if (formulaStarters.some(starter => str.startsWith(starter))) {
    return `'${str}`;
  }

  if (str.startsWith('|')) {
    return `'${str}`;
  }

  return str;
}

/**
 * Escape double quotes and wrap values containing special characters
 */
export function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Prepare a CSV cell for export with sanitization and escaping
 */
export function prepareCSVCell(value: unknown): string {
  const sanitized = sanitizeCSVCell(value);
  return escapeCSVValue(sanitized);
}
