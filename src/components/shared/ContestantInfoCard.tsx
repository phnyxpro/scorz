import React from "react";
import { FormFieldConfig, FormBuilderConfig, getScorecardFields, migrateFormConfig } from "@/lib/form-builder-types";

interface ContestantInfoCardProps {
  formConfig: any;
  customFieldValues: Record<string, any>;
}

/**
 * Compact info strip showing contestant's custom field values
 * that are flagged as show_on_scorecard in the form config.
 * Rendered directly below the video embed on the judge scorecard.
 */
export function ContestantInfoCard({ formConfig, customFieldValues }: ContestantInfoCardProps) {
  const config = migrateFormConfig(formConfig);
  const scorecardFields = getScorecardFields(config);

  if (scorecardFields.length === 0 || !customFieldValues) return null;

  const entries = scorecardFields
    .filter(f => f.field_type !== "url" && customFieldValues[f.id] != null && customFieldValues[f.id] !== "")
    .map(f => ({
      label: f.label,
      value: String(customFieldValues[f.id]),
    }));

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-card/80 px-4 py-3">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {entries.map((e, i) => (
          <div key={i} className="flex items-baseline gap-1.5 text-xs">
            <span className="text-muted-foreground whitespace-nowrap">{e.label}:</span>
            <span className="font-medium text-foreground">{e.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** For printed score cards — inline label/value pairs */
export function ScorecardFieldsInline({
  formConfig,
  customFieldValues,
}: {
  formConfig: any;
  customFieldValues: Record<string, any>;
}) {
  const config = migrateFormConfig(formConfig);
  const scorecardFields = getScorecardFields(config);

  if (scorecardFields.length === 0 || !customFieldValues) return null;

  const entries = scorecardFields
    .filter(f => customFieldValues[f.id] != null && customFieldValues[f.id] !== "")
    .map(f => ({ label: f.label, value: String(customFieldValues[f.id]) }));

  if (entries.length === 0) return null;

  return (
    <div style={{ marginBottom: '8px', fontSize: '10px' }}>
      {entries.map((e, i) => (
        <span key={i} style={{ marginRight: '12px' }}>
          <span style={{ fontWeight: 'bold' }}>{e.label}:</span> {e.value}
        </span>
      ))}
    </div>
  );
}
