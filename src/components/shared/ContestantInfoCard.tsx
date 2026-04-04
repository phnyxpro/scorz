import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { User } from "lucide-react";
import { FormFieldConfig, FormBuilderConfig, getScorecardFields, migrateFormConfig } from "@/lib/form-builder-types";

interface ContestantInfoCardProps {
  formConfig: any; // raw registration_form_config from competition
  customFieldValues: Record<string, any>;
}

/**
 * Accordion card showing contestant's custom field values
 * that are flagged as show_on_scorecard in the form config.
 * Used in JudgeScoring and ScoreCard.
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
    <Card className="border-border/50 bg-card/80">
      <CardContent className="pt-0 pb-0">
        <Accordion type="single" collapsible defaultValue="profile-details">
          <AccordionItem value="profile-details" className="border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Profile Details
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pb-1">
                {entries.map((e, i) => (
                  <div key={i} className="flex justify-between items-baseline text-xs">
                    <span className="text-muted-foreground">{e.label}</span>
                    <span className="font-medium text-foreground">{e.value}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
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
