import React from "react";
import type { ContestantRegistration } from "@/hooks/useRegistrations";
import type { JudgeScore } from "@/hooks/useJudgeScores";
import { ScorecardFieldsInline } from "@/components/shared/ContestantInfoCard";

export interface RubricCriterion {
  id: string;
  name: string;
  notes?: string | null;
  point_values?: Record<string, number | { min: number; max: number }>;
  weight_percent?: number;
}

interface ScoreCardProps {
  contestant: ContestantRegistration;
  subEventName: string;
  competitionName: string;
  judgeScore?: JudgeScore;
  isBlank?: boolean;
  judgeName?: string;
  rubricCriteria?: RubricCriterion[];
  formConfig?: any;
}

export function ScoreCard({
  contestant,
  subEventName,
  competitionName,
  judgeScore,
  isBlank = false,
  judgeName,
  rubricCriteria = [],
  formConfig,
}: ScoreCardProps) {
  const cardStyle = {
    width: '8in',
    height: '5in',
    padding: '0.25in',
    margin: '0.125in',
    pageBreakInside: 'avoid' as const,
    fontSize: '12px',
    fontFamily: 'Arial, sans-serif',
    border: '1px solid #ccc',
    backgroundColor: 'white',
    position: 'relative' as const,
  };

  const headerStyle = {
    borderBottom: '2px solid #333',
    paddingBottom: '8px',
    marginBottom: '12px',
    textAlign: 'center' as const,
    fontSize: '14px',
    fontWeight: 'bold'
  };

  const sectionStyle = { marginBottom: '8px' };
  const labelStyle = { fontWeight: 'bold', display: 'inline-block', minWidth: '80px' };

  const criteria = rubricCriteria.length > 0
    ? rubricCriteria
    : [{ id: 'creativity', name: 'Creativity' }, { id: 'technique', name: 'Technique' }, { id: 'presentation', name: 'Presentation' }, { id: 'overall', name: 'Overall' }];

  const colCount = criteria.length;
  const scoreGridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${colCount}, 1fr)`,
    gap: '4px',
    marginTop: '8px'
  };

  const scoreBoxStyle = {
    border: '1px solid #666',
    padding: '4px',
    textAlign: 'center' as const,
    minHeight: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: colCount > 5 ? '9px' : '11px',
  };

  const criterionScores = (judgeScore?.criterion_scores as Record<string, number>) || {};

  // Collect criteria that have notes
  const criteriaWithNotes = criteria.filter(c => c.notes);

  return (
    <div style={cardStyle} className="score-card">
      <div style={headerStyle}>
        <div>{competitionName}</div>
        <div style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '4px' }}>{subEventName}</div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span><span style={labelStyle}>Contestant:</span> {isBlank ? '____________________' : contestant.full_name}</span>
          <span><span style={labelStyle}>Age:</span> {isBlank ? '___' : contestant.age_category}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><span style={labelStyle}>Location:</span> {isBlank ? '____________________' : (contestant.location || 'N/A')}</span>
          <span><span style={labelStyle}>Date:</span> {isBlank ? '__/__/____' : new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Custom scorecard fields */}
      {formConfig && !isBlank && (
        <ScorecardFieldsInline
          formConfig={formConfig}
          customFieldValues={(contestant as any)?.custom_field_values || {}}
        />
      )}

      <div style={sectionStyle}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Scoring Criteria:</div>
        <div style={scoreGridStyle}>
          {criteria.map(c => (
            <div key={c.id} style={scoreBoxStyle}>{c.name}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: '4px', marginTop: '4px' }}>
          {criteria.map(c => (
            <div key={c.id} style={scoreBoxStyle}>
              {criterionScores[c.id] != null ? criterionScores[c.id] : (isBlank ? '' : '___')}
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><span style={labelStyle}>Total Score:</span></span>
          <div style={{ border: '2px solid #333', padding: '4px 12px', fontSize: '16px', fontWeight: 'bold', minWidth: '60px', textAlign: 'center' }}>
            {judgeScore?.final_score != null ? Number(judgeScore.final_score).toFixed(2) : (isBlank ? '___' : '')}
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><span style={labelStyle}>Time:</span> {judgeScore?.performance_duration_seconds ? `${judgeScore.performance_duration_seconds}s` : (isBlank ? '__s' : '')}</span>
          <span><span style={labelStyle}>Penalty:</span> {judgeScore?.time_penalty || (isBlank ? '___' : '0')}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Comments:</div>
        <div style={{ border: '1px solid #666', padding: '4px', minHeight: '40px', fontSize: '10px' }}>
          {judgeScore?.comments || ''}
        </div>
      </div>

      {/* Rubric Notes */}
      {criteriaWithNotes.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ fontSize: '9px', color: '#555', borderTop: '1px dashed #999', paddingTop: '4px' }}>
            {criteriaWithNotes.map(c => (
              <div key={c.id} style={{ marginBottom: '2px' }}>
                <span style={{ fontWeight: 'bold' }}>{c.name}:</span> {c.notes}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={sectionStyle}>
        <div style={{ border: '1px solid #666', padding: '8px', marginTop: '8px', minHeight: '40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', marginBottom: '2px' }}>Judge Signature:</div>
            <div style={{ fontSize: '10px', color: '#666' }}>{judgeName || (isBlank ? '____________________' : '')}</div>
          </div>
          <div style={{ fontSize: '10px', textAlign: 'right' }}>Date: {isBlank ? '__/__/____' : new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: '0.25in', left: '0.25in', right: '0.25in', fontSize: '8px', textAlign: 'center', color: '#666', borderTop: '1px solid #ccc', paddingTop: '4px' }}>
        Official Score Card - {competitionName}
      </div>
    </div>
  );
}

interface ScoreCardBatchProps {
  contestants: ContestantRegistration[];
  subEventName: string;
  competitionName: string;
  judgeScores?: JudgeScore[];
  judgeName?: string;
  isBlank?: boolean;
  rubricCriteria?: RubricCriterion[];
}

export function ScoreCardBatch({
  contestants,
  subEventName,
  competitionName,
  judgeScores = [],
  judgeName,
  isBlank = false,
  rubricCriteria = []
}: ScoreCardBatchProps) {
  const scoreMap = judgeScores.reduce((acc, score) => {
    acc[score.contestant_registration_id] = score;
    return acc;
  }, {} as Record<string, JudgeScore>);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0', justifyContent: 'flex-start' }}>
      {contestants.map((contestant) => (
        <ScoreCard
          key={contestant.id}
          contestant={contestant}
          subEventName={subEventName}
          competitionName={competitionName}
          judgeScore={scoreMap[contestant.id]}
          judgeName={judgeName}
          isBlank={isBlank}
          rubricCriteria={rubricCriteria}
        />
      ))}
    </div>
  );
}
