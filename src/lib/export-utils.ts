import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface SheetRow {
  [key: string]: string | number;
}

/** Export data as CSV and trigger download */
export function exportCSV(rows: SheetRow[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h];
          const str = String(val ?? "");
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

/** Export data as XLSX and trigger download */
export async function exportXLSX(rows: SheetRow[], filename: string, sheetName = "Sheet1") {
  if (!rows.length) return;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  const headers = Object.keys(rows[0]);
  ws.addRow(headers);
  for (const row of rows) {
    ws.addRow(headers.map((h) => row[h]));
  }
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, `${filename}.xlsx`);
}

/** Export data as Google Sheets compatible CSV */
export function exportGoogleSheets(rows: SheetRow[], filename: string) {
  // Google Sheets works best with UTF-8 BOM for special characters
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h];
          const str = String(val ?? "");
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];
  const csvContent = "\ufeff" + csvLines.join("\n"); // UTF-8 BOM
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

/** Trigger browser print dialog for PDF export */
export function exportPDF() {
  window.print();
}

/** Export HTML element as PDF */
export async function exportElementAsPDF(element: HTMLElement, filename: string, options?: {
  format?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
}) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: options?.format || 'a4',
  });

  const imgWidth = pdf.internal.pageSize.getWidth();
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save(`${filename}.pdf`);
}

/** Export multiple HTML elements as a single PDF */
export async function exportMultipleElementsAsPDF(
  elements: HTMLElement[],
  filename: string,
  options?: {
    format?: 'a4' | 'letter' | 'legal';
    orientation?: 'portrait' | 'landscape';
    margin?: number;
    spacing?: number;
  }
) {
  const pdf = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: options?.format || 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = options?.margin || 10;
  const spacing = options?.spacing || 5;

  let yPosition = margin;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if we need a new page
    if (yPosition + imgHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
    yPosition += imgHeight + spacing;
  }

  pdf.save(`${filename}.pdf`);
}

/** Export multi-sheet XLSX workbook */
export async function exportMultiSheetXLSX(sheets: { name: string; rows: SheetRow[] }[], filename: string) {
  if (!sheets.length) return;
  const wb = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31));
    const sheetRows = sheet.rows.length ? sheet.rows : [{}];
    const headers = Object.keys(sheetRows[0]);
    ws.addRow(headers);
    for (const row of sheetRows) {
      ws.addRow(headers.map((h) => row[h]));
    }
  }
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, `${filename}.xlsx`);
}

/** Read XLSX/CSV file buffer into JSON rows */
export async function readXLSXToJson<T extends Record<string, any> = Record<string, any>>(
  data: ArrayBuffer
): Promise<T[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount < 2) return [];
  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "");
  });
  const rows: T[] = [];
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      const cell = row.getCell(idx + 1);
      obj[h] = cell.value ?? "";
    });
    rows.push(obj as T);
  }
  return rows;
}

/** Export HTML element as branded landscape letter PDF (borderless) */
export async function exportBrandedPDF(element: HTMLElement, filename: string) {
  return exportElementAsPDF(element, filename, { format: 'letter', orientation: 'landscape', margin: 0 });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
