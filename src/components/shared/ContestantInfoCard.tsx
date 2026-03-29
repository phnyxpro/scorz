import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, User } from "lucide-react";
import { FormFieldConfig, FormBuilderConfig, getScorecardFields, migrateFormConfig } from "@/lib/form-builder-types";

interface ContestantInfoCardProps {
  formConfig: any; // raw registration_form_config from competition
  customFieldValues: Record<string, any>;
}

/**
 * Collapsible card showing contestant's custom field values
 * that are flagged as show_on_scorecard in the form config.
 * Used in JudgeScoring and ScoreCard.
 */
export function ContestantInfoCard({ formConfig, customFieldValues }: ContestantInfoCardProps) {
  const config = migrateFormConfig(formConfig);
  const scorecardFields = getScorecardFields(config);

  if (scorecardFields.length === 0 || !customFieldValues) return null;

  const entries = scorecardFields
    .filter(f => customFieldValues[f.id] != null && customFieldValues[f.id] !== "")
    .map(f => ({
      label: f.label,
      value: String(customFieldValues[f.id]),
    }));

  if (entries.length === 0) return null;

  return (
    <Collapsible defaultOpen>
      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-3 pb-3">
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground flex-1">Contestant Info</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1">
              {entries.map((e, i) => (
                <div key={i} className="flex justify-between items-baseline text-xs">
                  <span className="text-muted-foreground">{e.label}</span>
                  <span className="font-medium text-foreground">{e.value}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
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
