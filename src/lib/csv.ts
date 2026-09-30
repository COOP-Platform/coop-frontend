function cell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Build a CSV in the browser and hand it to the user as a download. */
export function downloadCsv(
  filename: string,
  header: readonly string[],
  rows: readonly (readonly (string | number)[])[],
): void {
  const csv = [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
