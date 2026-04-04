import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronRight, Globe, Video, Image as ImageIcon, Link as LinkIcon, User, Users, FileText, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormSchema, FormField, evaluateShowWhen } from "@/hooks/useRegistrationForm";

interface RegistrationFormDetailsProps {
  competitionId: string;
  registration: any;
  formSchema: FormSchema;
  isPublic?: boolean;
}

export function RegistrationFormDetails({ registration, formSchema, isPublic, competitionId }: RegistrationFormDetailsProps) {
  const values = useMemo(() => ({
    ...registration,
    ...(registration.custom_field_values || {})
  }), [registration]);

  // Collect all IDs for name resolution
  const allIds = useMemo(() => {
    const ids = new Set<string>();
    const collectFromFields = (fields: FormField[], vals: any) => {
      fields.forEach(f => {
        const val = vals[f.key];
        if (!val) return;
        
        if (["level_selector", "category_selector", "subcategory_selector", "subevent_selector", "time_slot_selector"].includes(f.type)) {
          if (typeof val === "string") ids.add(val);
        }
        
        if (f.type === "repeater" && Array.isArray(val)) {
          val.forEach((row: any) => {
            if (f.repeaterFields) collectFromFields(f.repeaterFields, row);
          });
        }
      });
    };

    formSchema.forEach(section => collectFromFields(section.fields, values));
    return Array.from(ids);
  }, [formSchema, values]);

  // Resolve names for all found IDs
  const { data: nameMap } = useQuery({
    queryKey: ["resolved-names-for-details", allIds],
    enabled: allIds.length > 0,
    queryFn: async () => {
      const map: Record<string, string> = {};
      const [levels, cats, subs, slots] = await Promise.all([
        supabase.from("competition_levels").select("id, name").in("id", allIds),
        supabase.from("competition_categories").select("id, name").in("id", allIds),
        supabase.from("sub_events").select("id, name").in("id", allIds),
        supabase.from("performance_slots").select("id, start_time").in("id", allIds),
      ]);
      
      levels.data?.forEach(l => map[l.id] = l.name);
      cats.data?.forEach(c => map[c.id] = c.name);
      subs.data?.forEach(s => map[s.id] = s.name);
      slots.data?.forEach((sl: any) => map[sl.id] = sl.start_time);
      return map;
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {formSchema.map((section) => {
        const visibleFields = section.fields.filter(f => evaluateShowWhen(f.showWhen, values));
        if (visibleFields.length === 0) return null;

        return (
          <Card key={section.id} className="border-border/40 bg-card/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 py-4 px-5">
              <CardTitle className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                 <FileText className="h-4 w-4 text-primary/70" />
                 {section.title}
              </CardTitle>
              {section.description && (
                <CardDescription className="text-xs italic leading-relaxed">
                  {section.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="py-5 px-5">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {visibleFields.map((field) => (
                  <DetailFieldRenderer
                    key={field.id}
                    field={field}
                    value={values[field.key]}
                    nameMap={nameMap}
                    isPublic={isPublic}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DetailFieldRenderer({ field, value, nameMap, isPublic }: {
  field: FormField;
  value: any;
  nameMap?: Record<string, string>;
  isPublic?: boolean;
}) {
  // Respect user request: Do not display signatures or rules acknowledgment to public
  if (isPublic && (field.type === "signature" || field.type === "rules_acknowledgment")) {
    return null;
  }

  // Formatting wrappers (H1, Divider etc)
  if (field.type === "heading") {
    return <h4 className="col-span-full text-sm font-bold text-foreground mt-2 border-l-2 border-primary/50 pl-2">{field.label}</h4>;
  }
  if (field.type === "paragraph") {
    return <p className="col-span-full text-xs text-muted-foreground leading-relaxed italic">{field.description || field.label}</p>;
  }
  if (field.type === "divider") {
    return <Separator className="col-span-full my-1 opacity-40" />;
  }

  // Handle empty values
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  // Handle repeaters recursively
  if (field.type === "repeater" && Array.isArray(value)) {
    return (
      <div className="col-span-full space-y-3 bg-muted/10 p-4 rounded-xl border border-border/20">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-primary/70" />
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{field.label}</h4>
          <Badge variant="secondary" className="text-[10px] ml-auto bg-muted">{value.length} Entries</Badge>
        </div>
        <div className="space-y-3">
          {value.map((row, idx) => (
            <div key={idx} className="bg-card/30 p-3 rounded-lg border border-border/10 shadow-sm relative pl-6">
              <span className="absolute top-3 left-2 w-1.5 h-1.5 bg-primary/40 rounded-full" />
              <div className="grid gap-3 sm:grid-cols-2">
                {field.repeaterFields?.filter(f => evaluateShowWhen(f.showWhen, row)).map(sub => (
                  <DetailFieldRenderer
                    key={sub.id}
                    field={sub}
                    value={row[sub.key]}
                    nameMap={nameMap}
                    isPublic={isPublic}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  let displayValue = value;
  let icon = null;

  // Resolve Names for selectors
  if (nameMap && (field.type.includes("_selector") || field.type === "subcategory_selector")) {
    displayValue = nameMap[value] || value;
  }

  // Format by type
  switch (field.type) {
    case "email":
      icon = <Globe className="h-3 w-3" />;
      break;
    case "url":
      displayValue = (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
          {field.label.toLowerCase().includes("video") ? <Video className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
          View Link
        </a>
      );
      break;
    case "checkbox":
    case "toggle":
    case "consent":
    case "rules_acknowledgment":
      displayValue = (
        <div className="flex items-center gap-2">
          {value ? <Badge className="bg-secondary/20 text-secondary border-secondary/30 h-5 text-[10px]">YES</Badge> : <Badge variant="outline" className="h-5 text-[10px]">NO</Badge>}
        </div>
      );
      break;
    case "signature":
      displayValue = (
        <div className="mt-1 p-2 bg-white rounded border border-border/20 max-w-[200px] shadow-inner">
          <img src={value} alt="Signature" className="max-h-12 w-auto opacity-90 contrast-125" />
        </div>
      );
      break;
    case "textarea":
    case "rich_text":
      return (
        <div className="col-span-full space-y-1.5 py-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Info className="h-3 w-3 opacity-50" />
            {field.label}
          </p>
          <div className="text-sm text-foreground/90 leading-relaxed bg-white/40 p-4 rounded-lg border border-border/30 whitespace-pre-wrap shadow-sm">
            {value}
          </div>
        </div>
      );
  }

  return (
    <div className={`space-y-1.5 ${field.columns === 2 ? 'col-span-full' : ''}`}>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 opacity-70">
        {icon}
        {field.label}
      </p>
      <div className="text-sm font-semibold text-foreground/90 break-words flex items-center gap-2">
        {typeof displayValue === "object" && !Array.isArray(displayValue) ? JSON.stringify(displayValue) : displayValue}
      </div>
    </div>
  );
}
