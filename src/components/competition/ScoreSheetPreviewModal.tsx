import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, Sheet, AlertTriangle } from "lucide-react";
import { exportMultiSheetXLSX, exportGoogleSheets, type SheetRow } from "@/lib/export-utils";
import type { PreviewData } from "./ScoreSheetDownloads";

interface ScoreSheetPreviewModalProps {
  data: PreviewData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SheetTable({ rows }: { rows: SheetRow[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground p-4">No data</p>;
  const headers = Object.keys(rows[0]);

  return (
    <ScrollArea className="max-h-[55vh]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h} className="whitespace-nowrap text-xs font-semibold">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {headers.map((h) => (
                  <TableCell key={h} className="whitespace-nowrap text-xs py-1.5 px-3">
                    {String(row[h] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}

function PenaltyLegend({ rules }: { rules: { from_seconds: number; to_seconds: number | null; penalty_points: number }[] }) {
  if (!rules.length) return null;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="rounded-md border border-border/50 bg-muted/30 p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5" />
        Penalty Legend
      </div>
      {rules.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px] font-mono">
            {fmt(r.from_seconds)} – {r.to_seconds !== null ? fmt(r.to_seconds) : "∞"}
          </Badge>
          <span className="text-destructive font-medium">-{r.penalty_points} pts</span>
        </div>
      ))}
    </div>
  );
}

export function ScoreSheetPreviewModal({ data, open, onOpenChange }: ScoreSheetPreviewModalProps) {
  const { subEventName, masterRows, judgeSheets, fetched } = data;

  const handleExcel = () => {
    const sheets = [
      { name: "Master", rows: masterRows },
      ...judgeSheets.map((js) => ({ name: js.name, rows: js.rows })),
    ];
    exportMultiSheetXLSX(sheets, `${subEventName.replace(/[^a-zA-Z0-9 ]/g, "")}_Scores`);
  };

  const handleCSV = () => {
    exportGoogleSheets(masterRows, `${subEventName.replace(/[^a-zA-Z0-9 ]/g, "")}_Scores`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{subEventName} — Score Sheet Preview</DialogTitle>
          <DialogDescription className="text-xs">
            Olympic scoring: (Total − MIN − MAX) ÷ (Judges − 2) − Penalty
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="master" className="flex-1 min-h-0">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="master" className="text-xs">Master</TabsTrigger>
            {judgeSheets.map((js) => (
              <TabsTrigger key={js.judgeId} value={js.judgeId} className="text-xs">
                {js.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="master" className="mt-2">
            <SheetTable rows={masterRows} />
          </TabsContent>

          {judgeSheets.map((js) => (
            <TabsContent key={js.judgeId} value={js.judgeId} className="mt-2">
              <SheetTable rows={js.rows} />
            </TabsContent>
          ))}
        </Tabs>

        <PenaltyLegend rules={fetched.penaltyRules} />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={handleCSV}>
            <Sheet className="h-4 w-4 mr-1.5" />
            Google Sheets
          </Button>
          <Button size="sm" onClick={handleExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Download Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
