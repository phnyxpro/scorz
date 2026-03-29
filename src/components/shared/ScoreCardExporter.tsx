import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileText, Users, User } from "lucide-react";
import { exportMultipleElementsAsPDF, exportElementAsPDF } from "@/lib/export-utils";
import { ScoreCard } from "./ScoreCard";
import type { RubricCriterion } from "./ScoreCard";
import type { ContestantRegistration } from "@/hooks/useRegistrations";
import type { JudgeScore } from "@/hooks/useJudgeScores";

interface ScoreCardExporterProps {
  contestants: ContestantRegistration[];
  subEventName: string;
  competitionName: string;
  judgeScores?: JudgeScore[];
  judgeName?: string;
  availableJudges?: { id: string; name: string }[];
  rubricCriteria?: RubricCriterion[];
}

export function ScoreCardExporter({
  contestants,
  subEventName,
  competitionName,
  judgeScores = [],
  judgeName,
  availableJudges = [],
  rubricCriteria = []
}: ScoreCardExporterProps) {
  const [exportType, setExportType] = useState<'individual' | 'batch'>('batch');
  const [includeData, setIncludeData] = useState(true);
  const [selectedJudge, setSelectedJudge] = useState<string>(judgeName || '');
  const [isExporting, setIsExporting] = useState(false);
  const batchRef = useRef<HTMLDivElement>(null);

  const handleBatchExport = async () => {
    if (!batchRef.current) return;
    setIsExporting(true);
    try {
      const filename = `${competitionName.replace(/\s+/g, '-')}-${subEventName.replace(/\s+/g, '-')}-score-cards`;
      await exportMultipleElementsAsPDF(
        Array.from(batchRef.current.children) as HTMLElement[],
        filename,
        { format: 'letter', orientation: 'landscape', margin: 5, spacing: 10 }
      );
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleIndividualExport = async (contestant: ContestantRegistration) => {
    const scoreCardElement = document.getElementById(`score-card-${contestant.id}`);
    if (!scoreCardElement) return;
    setIsExporting(true);
    try {
      const filename = `${contestant.full_name.replace(/\s+/g, '-')}-score-card`;
      await exportElementAsPDF(scoreCardElement as HTMLElement, filename, { format: 'letter', orientation: 'landscape' });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const scoreMap = judgeScores.reduce((acc, score) => {
    acc[score.contestant_registration_id] = score;
    return acc;
  }, {} as Record<string, JudgeScore>);

  const selectedJudgeName = availableJudges.find(j => j.id === selectedJudge)?.name || judgeName;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Score Card Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="export-type">Export Type</Label>
            <Select value={exportType} onValueChange={(value: 'individual' | 'batch') => setExportType(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="batch"><div className="flex items-center gap-2"><Users className="h-4 w-4" />Batch Export (All Cards)</div></SelectItem>
                <SelectItem value="individual"><div className="flex items-center gap-2"><User className="h-4 w-4" />Individual Cards</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="judge-select">Judge</Label>
            <Select value={selectedJudge} onValueChange={setSelectedJudge}>
              <SelectTrigger><SelectValue placeholder="Select judge (optional)" /></SelectTrigger>
              <SelectContent>
                {availableJudges.map((judge) => (
                  <SelectItem key={judge.id} value={judge.id}>{judge.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 pt-8">
            <Checkbox id="include-data" checked={includeData} onCheckedChange={(checked) => setIncludeData(checked as boolean)} />
            <Label htmlFor="include-data">Include contestant data</Label>
          </div>
        </div>

        <div className="flex gap-2">
          {exportType === 'batch' ? (
            <Button onClick={handleBatchExport} disabled={isExporting || contestants.length === 0} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : `Export ${contestants.length} Score Cards`}
            </Button>
          ) : (
            <div className="text-sm text-muted-foreground">Individual exports available in the contestant list below</div>
          )}
          <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />Print Current View
          </Button>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="text-sm font-medium mb-2">Preview:</div>
          {exportType === 'batch' ? (
            <div ref={batchRef} className="flex flex-wrap gap-2 justify-center">
              {contestants.slice(0, 6).map((contestant) => (
                <div key={contestant.id} className="transform scale-50 origin-top-left">
                  <ScoreCard contestant={contestant} subEventName={subEventName} competitionName={competitionName} judgeScore={scoreMap[contestant.id]} judgeName={selectedJudgeName} isBlank={!includeData} rubricCriteria={rubricCriteria} />
                </div>
              ))}
              {contestants.length > 6 && (
                <div className="w-full text-center text-sm text-muted-foreground mt-4">... and {contestants.length - 6} more cards</div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {contestants.slice(0, 3).map((contestant) => (
                <div key={contestant.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{contestant.full_name}</div>
                    <div className="text-sm text-muted-foreground">{contestant.age_category}</div>
                  </div>
                  <Button size="sm" onClick={() => handleIndividualExport(contestant)} disabled={isExporting}>
                    <Download className="h-4 w-4 mr-1" />Export Card
                  </Button>
                  <div id={`score-card-${contestant.id}`} className="hidden">
                    <ScoreCard contestant={contestant} subEventName={subEventName} competitionName={competitionName} judgeScore={scoreMap[contestant.id]} judgeName={selectedJudgeName} isBlank={!includeData} rubricCriteria={rubricCriteria} />
                  </div>
                </div>
              ))}
              {contestants.length > 3 && (
                <div className="text-center text-sm text-muted-foreground">... and {contestants.length - 3} more contestants</div>
              )}
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Batch Export:</strong> Downloads all score cards as a single PDF file.</p>
          <p><strong>Individual Export:</strong> Downloads each score card as a separate PDF.</p>
          <p><strong>Blank Templates:</strong> Uncheck "Include contestant data" for blank cards.</p>
          <p><strong>Print Settings:</strong> Score cards are designed for 8" x 5" paper, landscape orientation.</p>
        </div>
      </CardContent>
    </Card>
  );
}
