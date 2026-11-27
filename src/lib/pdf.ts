/*
 * A list as a PDF, built in the browser: a title, who it is for and when it
 * was made, and the table, with page numbers. The PDF library is loaded only
 * when someone downloads, so it costs nothing on page load.
 *
 * Members found CSV files hard to open; every "export" in the app is a PDF.
 */

export interface PdfTable {
  /** "members-2026-11-27.pdf" */
  filename: string;
  /** "Members" */
  title: string;
  /** The community's name, shown above the title. */
  community?: string;
  /** One line under the title: the filters, the period. */
  subtitle?: string;
  header: readonly string[];
  rows: readonly (readonly (string | number)[])[];
  /** A bold last row, e.g. the total. */
  totals?: readonly (string | number)[];
  /** Columns to right-align (amounts), by index. */
  numeric?: readonly number[];
}

const BRAND: [number, number, number] = [15, 77, 44]; // --color-brand #0f4d2c

export async function downloadTablePdf(table: PdfTable): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const left = 14;
  let y = 16;

  if (table.community) {
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(100);
    doc.text(table.community, left, y);
    y += 7;
  }
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(20);
  doc.text(table.title, left, y);
  y += 6;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110);
  const made = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(
    [table.subtitle, `${table.rows.length} rows · made ${made}`].filter(Boolean).join(' · '),
    left,
    y,
  );

  const right = Object.fromEntries(
    (table.numeric ?? []).map((i) => [i, { halign: 'right' as const }]),
  );
  autoTable(doc, {
    startY: y + 5,
    head: [table.header.map(String)],
    body: table.rows.map((row) => row.map(String)),
    // The total row lines up with its columns (amounts on the right).
    foot: table.totals
      ? [
          table.totals.map((cell, i) => ({
            content: String(cell),
            styles: { halign: (table.numeric ?? []).includes(i) ? 'right' : 'left' } as const,
          })),
        ]
      : undefined,
    showFoot: 'lastPage',
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.2 },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [235, 242, 237], textColor: 20, fontStyle: 'bold' },
    columnStyles: right,
    margin: { left, right: left },
  });

  // Numbered once the table is laid out, so "of N" is the real total.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(140);
    doc.text(
      `Page ${page} of ${pages}`,
      doc.internal.pageSize.getWidth() - left,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    );
  }

  doc.save(table.filename);
}

/** "2026-11-27", for file names. */
export const today = () => new Date().toISOString().slice(0, 10);
