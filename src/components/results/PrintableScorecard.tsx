import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { JudgeScore } from "@/hooks/useJudgeScores";

interface Props {
  competitionName: string;
  subEventName: string;
  contestantName: string;
  scores: JudgeScore[];
  sortedRubric: { id: string; name: string }[];
  indexToName: Record<string, string>;
  overallAvg: number;
  criterionAverages: Record<string, number>;
}

export function PrintableScorecard({
  competitionName,
  subEventName,
  contestantName,
  scores,
  sortedRubric,
  indexToName,
  overallAvg,
  criterionAverages,
}: Props) {
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
        <title>${contestantName} - Scorecard</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Georgia', serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 3px double #333; padding-bottom: 16px; }
          .header h1 { font-size: 22px; letter-spacing: 2px; margin-bottom: 2px; }
          .header h2 { font-size: 14px; font-weight: normal; color: #555; }
          .header .contestant { font-size: 18px; font-weight: bold; margin-top: 10px; }
          .header .label { font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-top: 4px; }
          .overview { margin: 20px 0; padding: 16px; border: 2px solid #333; text-align: center; }
          .overview .big { font-size: 36px; font-family: 'Courier New', monospace; font-weight: bold; }
          .overview .sub { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
          .criteria-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .criteria-table th { background: #f5f5f5; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #333; }
          .criteria-table td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 13px; }
          .criteria-table td.score { text-align: center; font-family: 'Courier New', monospace; }
          .criteria-table .bar-cell { width: 200px; }
          .bar-bg { background: #eee; height: 10px; border-radius: 5px; overflow: hidden; }
          .bar-fill { background: #333; height: 100%; border-radius: 5px; }
          h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 28px 0 12px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
          .judge-card { border: 1px solid #ddd; padding: 14px; margin-bottom: 12px; page-break-inside: avoid; }
          .judge-card .judge-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .judge-card .judge-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
          .judge-card .judge-final { font-family: 'Courier New', monospace; font-weight: bold; font-size: 16px; }
          .judge-card .scores-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; margin-bottom: 8px; }
          .judge-card .score-item { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
          .judge-card .score-item .val { font-family: 'Courier New', monospace; }
          .judge-card .meta { font-size: 11px; color: #666; }
          .judge-card .comments { margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; font-size: 12px; font-style: italic; color: #444; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #ddd; padding-top: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
        <Download className="h-3.5 w-3.5" /> Download Scorecard
      </Button>

      <div ref={printRef} style={{ display: "none" }}>
        <div className="header">
          <h1>{competitionName}</h1>
          <h2>{subEventName}</h2>
          <div className="label">Individual Scorecard</div>
          <div className="contestant">{contestantName}</div>
        </div>

        <div className="overview">
          <div className="big">{overallAvg.toFixed(2)}</div>
          <div className="sub">Overall Final Average — {scores.length} Judge{scores.length > 1 ? "s" : ""}</div>
        </div>

        <table className="criteria-table">
          <thead>
            <tr>
              <th>Criterion</th>
              <th style={{ textAlign: "center" }}>Average</th>
              <th className="bar-cell">Performance</th>
            </tr>
          </thead>
          <tbody>
            {sortedRubric.map((c) => {
              const avg = criterionAverages[c.name];
              const pct = avg != null ? (avg / 5) * 100 : 0;
              return (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="score">{avg != null ? avg.toFixed(2) : "—"} / 5.00</td>
                  <td className="bar-cell">
                    <div className="bar-bg"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3>Judge Feedback</h3>
        {scores.map((score, idx) => {
          const cs = score.criterion_scores as Record<string, number>;
          const mapped: Record<string, number> = {};
          for (const [k, v] of Object.entries(cs)) { mapped[indexToName[k] ?? k] = v; }

          return (
            <div className="judge-card" key={score.id}>
              <div className="judge-header">
                <span className="judge-label">Judge #{idx + 1}</span>
                <span className="judge-final">{score.final_score.toFixed(2)}</span>
              </div>
              <div className="scores-grid">
                {sortedRubric.map((c) => (
                  <div className="score-item" key={c.id}>
                    <span>{c.name}</span>
                    <span className="val">{mapped[c.name] ?? "—"}</span>
                  </div>
                ))}
              </div>
              <div className="meta">
                Raw: {score.raw_total}
                {score.time_penalty > 0 && ` • Penalty: -${score.time_penalty}`}
              </div>
              {score.comments && <div className="comments">"{score.comments}"</div>}
              {score.is_certified && (
                <div className="sig-stamp">
                  <span className="sig-icon">✓</span>
                  <span>Digitally signed via Scorz</span>
                  <span className="sig-sep">·</span>
                  <span>Role: Judge</span>
                  <span className="sig-sep">·</span>
                  <span>{score.signed_at ? new Date(score.signed_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "—"}</span>
                </div>
              )}
              {score.judge_signature && (
                <div className="sig-image">
                  <img src={score.judge_signature} alt="Judge signature" style={{ maxHeight: 50, opacity: 0.8 }} />
                </div>
              )}
            </div>
          );
        })}

        <div className="footer">
          Generated on {new Date().toLocaleString()} • © 2026 SCORZ Powered by phnyx.dev
        </div>
      </div>
    </>
  );
}
