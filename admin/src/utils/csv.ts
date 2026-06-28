/**
 * OmniQ admin panel - CSV export utility.
 * Author: OmniQ Team
 */
export function toCsv(rows: ReadonlyArray<Record<string, string | number>>): string {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const values = rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","));
  return [headers.join(","), ...values].join("\n");
}
