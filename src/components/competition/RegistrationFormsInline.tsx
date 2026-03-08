import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Info, Calendar, PenTool } from "lucide-react";
import { useLevels, useSubEvents } from "@/hooks/useCompetitions";
import { AGE_CATEGORIES } from "@/lib/age-categories";

interface Props {
  competitionId: string;
}

const sectionIcon: Record<string, React.ElementType> = {
  personal: User,
  bio: Info,
  event: Calendar,
  legal: PenTool,
};

export function RegistrationFormsInline({ competitionId }: Props) {
  const { data: levels } = useLevels(competitionId);
  const firstLevelId = levels?.[0]?.id;
  const { data: subEvents } = useSubEvents(firstLevelId);

  const sections = [
    {
      key: "personal",
      title: "Personal Info",
      fields: [
        { label: "First Name", type: "text", required: true },
        { label: "Last Name", type: "text", required: true },
        { label: "Email", type: "email", required: true },
        { label: "Phone", type: "tel", required: false },
        { label: "Location", type: "text", required: false },
        { label: "Age Category", type: "select", required: true, options: AGE_CATEGORIES?.map(c => c.label) || ["Adult", "Minor"] },
      ],
    },
    {
      key: "bio",
      title: "Bio & Media",
      fields: [
        { label: "Bio", type: "textarea", required: false },
        { label: "Performance Video URL", type: "url", required: false },
      ],
    },
    {
      key: "event",
      title: "Event Details",
      fields: [
        { label: "Level", type: "select", required: false, options: levels?.map(l => l.name) || [] },
        { label: "Sub-Event", type: "select", required: false, options: subEvents?.map(se => se.name) || [] },
      ],
    },
    {
      key: "legal",
      title: "Legal & Consent",
      fields: [
        { label: "Rules Acknowledged", type: "checkbox", required: true },
        { label: "Contestant Signature", type: "signature", required: true },
        { label: "Guardian Name", type: "text", required: false, note: "Required for minors" },
        { label: "Guardian Email", type: "email", required: false, note: "Required for minors" },
        { label: "Guardian Signature", type: "signature", required: false, note: "Required for minors" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        This is a read-only preview of the registration form fields contestants complete when registering.
      </p>

      {sections.map((section) => {
        const Icon = sectionIcon[section.key] || User;
        return (
          <Card key={section.key} className="border-border/40 bg-muted/10">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">{section.title}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.fields.map((field) => (
                  <div key={field.label} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
                      {(field as any).note && (
                        <span className="text-[10px] text-muted-foreground/70">({(field as any).note})</span>
                      )}
                    </Label>
                    {field.type === "textarea" ? (
                      <Textarea disabled placeholder={field.label} className="mt-1 text-xs min-h-[48px] opacity-60" />
                    ) : field.type === "select" ? (
                      <Select disabled>
                        <SelectTrigger className="mt-1 h-8 text-xs opacity-60">
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === "checkbox" ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Checkbox disabled className="opacity-60" />
                        <span className="text-xs text-muted-foreground">I acknowledge and accept the rules</span>
                      </div>
                    ) : field.type === "signature" ? (
                      <div className="mt-1 h-12 rounded border border-dashed border-border/50 bg-muted/20 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground italic">Signature pad</span>
                      </div>
                    ) : (
                      <Input disabled placeholder={field.label} className="mt-1 h-8 text-xs opacity-60" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
