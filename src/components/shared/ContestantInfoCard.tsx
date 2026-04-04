import React from "react";
import { FormFieldConfig, FormBuilderConfig, getScorecardFields, getScorecardLayout, migrateFormConfig, ScorecardCard } from "@/lib/form-builder-types";

interface ContestantInfoCardProps {
  formConfig: any;
  customFieldValues: Record<string, any>;
}

/**
 * 3-column sub-card layout showing contestant's custom field values
 * that are flagged as show_on_scorecard in the form config.
 * Uses scorecard_layout config for card grouping if available.
 */
export function ContestantInfoCard({ formConfig, customFieldValues }: ContestantInfoCardProps) {
  const config = migrateFormConfig(formConfig);
  const scorecardFields = getScorecardFields(config);
  const cards = getScorecardLayout(config);

  if (scorecardFields.length === 0 || !customFieldValues) return null;

  // Build lookup
  const fieldMap = new Map(scorecardFields.map(f => [f.id, f]));

  // Filter out URL fields (shown as video embed) and empty values
  const resolveEntries = (fieldIds: string[]) =>
    fieldIds
      .map(id => fieldMap.get(id))
      .filter((f): f is FormFieldConfig => !!f && f.field_type !== "url")
      .filter(f => customFieldValues[f.id] != null && customFieldValues[f.id] !== "")
      .map(f => ({ label: f.label, value: String(customFieldValues[f.id]) }));

  // If no layout config, show all fields distributed across auto-generated cards
  const renderedCards = cards.map(card => ({
    ...card,
    entries: resolveEntries(card.field_ids),
  })).filter(c => c.entries.length > 0);

  // Fallback: if no cards have entries, try showing all fields in a single strip
  if (renderedCards.length === 0) {
    const allEntries = scorecardFields
      .filter(f => f.field_type !== "url" && customFieldValues[f.id] != null && customFieldValues[f.id] !== "")
      .map(f => ({ label: f.label, value: String(customFieldValues[f.id]) }));
    if (allEntries.length === 0) return null;
    return (
      <div className="rounded-lg border border-border/50 bg-card/80 px-4 py-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {allEntries.map((e, i) => (
            <div key={i} className="flex items-baseline gap-1.5 text-xs">
              <span className="text-muted-foreground whitespace-nowrap">{e.label}:</span>
              <span className="font-medium text-foreground">{e.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {renderedCards.map(card => (
        <div
          key={card.id}
          className="rounded-lg border border-border/40 bg-card/60 backdrop-blur-sm p-3 space-y-2"
        >
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-1.5">
            {card.title}
          </h4>
          <div className="space-y-1.5">
            {card.entries.map((e, i) => (
              <div key={i} className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{e.label}:</span>
                <span className="text-xs font-medium text-foreground break-words">{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
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
