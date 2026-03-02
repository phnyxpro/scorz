import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintableResultsProps {
  competitionName: string;
  subEventName: string;
  leaderboard: {
    regId: string;
    name: string;
    criterionAvgs: Record<string, number>;
    avgFinal: number;
    judgeCount: number;
  }[];
  rubricNames: string[];
  certificationDates: {
    chiefJudge?: string;
    tabulator?: string;
    witness?: string;
  };
}

export function PrintableResults({
  competitionName,
  subEventName,
  leaderboard,
  rubricNames,
  certificationDates,
}: PrintableResultsProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${competitionName} - Official Results</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Georgia', serif; color: #1a1a1a; padding: 40px; }
          .header { text-align: center; margin-bottom: 32px; border-bottom: 3px double #333; padding-bottom: 20px; }
          .header h1 { font-size: 28px; letter-spacing: 2px; margin-bottom: 4px; }
          .header h2 { font-size: 16px; font-weight: normal; color: #555; }
          .header .official { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f5f5f5; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #333; }
          td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 13px; }
          td.rank { font-weight: bold; text-align: center; width: 40px; }
          td.score { text-align: center; font-family: 'Courier New', monospace; }
          td.final { font-weight: bold; font-size: 14px; }
          .medal-1 { color: #DAA520; }
          .medal-2 { color: #A8A8A8; }
          .medal-3 { color: #CD7F32; }
          .certifications { margin-top: 40px; border-top: 2px solid #333; padding-top: 20px; }
          .cert-row { display: flex; justify-content: space-between; margin: 16px 0; }
          .cert-item { text-align: center; flex: 1; }
          .cert-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
          .cert-item .line { border-bottom: 1px solid #333; margin: 20px auto 4px; width: 200px; }
          .cert-item .date { font-size: 10px; color: #888; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #aaa; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
        <Printer className="h-3.5 w-3.5" /> Export PDF
      </Button>

      <div ref={printRef} style={{ display: "none" }}>
        <div className="header">
          <h1>{competitionName}</h1>
          <h2>{subEventName}</h2>
          <div className="official">Official Certified Results</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: "center" }}>Rank</th>
              <th>Contestant</th>
              {rubricNames.map((n) => (
                <th key={n} style={{ textAlign: "center" }}>{n}</th>
              ))}
              <th style={{ textAlign: "center" }}>Judges</th>
              <th style={{ textAlign: "center" }}>Final Avg</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((r, i) => (
              <tr key={r.regId}>
                <td className={`rank ${i === 0 ? "medal-1" : i === 1 ? "medal-2" : i === 2 ? "medal-3" : ""}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </td>
                <td>{r.name}</td>
                {rubricNames.map((n) => (
                  <td key={n} className="score">
                    {r.criterionAvgs[n] != null ? r.criterionAvgs[n].toFixed(2) : "—"}
                  </td>
                ))}
                <td className="score">{r.judgeCount}</td>
                <td className="score final">{r.avgFinal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="certifications">
          <div className="cert-row">
            <div className="cert-item">
              <div className="line" />
              <div className="label">Chief Judge</div>
              {certificationDates.chiefJudge && (
                <div className="date">Signed: {new Date(certificationDates.chiefJudge).toLocaleDateString()}</div>
              )}
            </div>
            <div className="cert-item">
              <div className="line" />
              <div className="label">Tabulator</div>
              {certificationDates.tabulator && (
                <div className="date">Signed: {new Date(certificationDates.tabulator).toLocaleDateString()}</div>
              )}
            </div>
            <div className="cert-item">
              <div className="line" />
              <div className="label">Witness</div>
              {certificationDates.witness && (
                <div className="date">Signed: {new Date(certificationDates.witness).toLocaleDateString()}</div>
              )}
            </div>
          </div>
        </div>

        <div className="footer">
          Generated on {new Date().toLocaleString()} • @ 2026 SCORZ Powered by phnyx.dev
        </div>
      </div>
    </>
  );
}
