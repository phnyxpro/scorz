import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, Printer } from "lucide-react";
import { exportCSV, exportXLSX, exportPDF, type SheetRow } from "@/lib/export-utils";

interface ExportDropdownProps {
  rows: SheetRow[];
  filename: string;
  sheetName?: string;
  disabled?: boolean;
}

export function ExportDropdown({ rows, filename, sheetName = "Scores", disabled }: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || rows.length === 0} className="print:hidden">
          <Download className="h-4 w-4 mr-1.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem onClick={() => exportPDF()}>
          <Printer className="h-4 w-4 mr-2" />
          Print / PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportCSV(rows, filename)}>
          <FileText className="h-4 w-4 mr-2" />
          CSV (Google Sheets)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportXLSX(rows, filename, sheetName)}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel (XLSX)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
