import { useEffect, useCallback, useState, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useRubricCriteria,
  useCreateRubricCriterion,
  useUpdateRubricCriterion,
  useDeleteRubricCriterion,
  useCompetition,
  useUpdateCompetition,
  RubricScaleLabels,
} from "@/hooks/useCompetitions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, GripVertical, Wand2, Save, BookOpen, Minus, Star } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const criterionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Title is required"),
  guidelines: z.string().optional(),
  weight_percent: z.coerce.number().min(0).default(0),
  description_1: z.string().default(""),
  description_2: z.string().default(""),
  description_3: z.string().default(""),
  description_4: z.string().default(""),
  description_5: z.string().default(""),
  scale_descriptions: z.record(z.string()).default({}),
  point_values: z.record(z.union([z.coerce.number(), z.object({ min: z.coerce.number(), max: z.coerce.number() })])).default({}),
  is_bonus: z.boolean().default(false),
  applies_to_categories: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const rubricSchema = z.object({
  scaleLabels: z.record(z.string()),
  criteria: z.array(criterionSchema).min(1, "At least one criterion is required"),
});

type RubricFormValues = z.infer<typeof rubricSchema>;

const DEFAULT_SCALE_LABELS: Record<string, string> = { "1": "Very Weak", "2": "Weak", "3": "Average", "4": "Good", "5": "Excellent" };

const DEFAULT_CRITERIA: Omit<RubricFormValues["criteria"][number], "id">[] = [
  { name: "Voice & Articulation", guidelines: "-Range of voice\n-Clarity of words (Diction)", weight_percent: 17, description_1: "Inaudible or unintelligible", description_2: "Occasionally unclear", description_3: "Generally clear", description_4: "Clear and expressive", description_5: "Exceptional vocal command", scale_descriptions: {}, point_values: {}, is_bonus: false, applies_to_categories: [], notes: "" },
  { name: "Stage Presence", guidelines: "-Confidence\n-Eye contact\n-Movement", weight_percent: 17, description_1: "No engagement", description_2: "Minimal engagement", description_3: "Adequate presence", description_4: "Commanding presence", description_5: "Captivating throughout", scale_descriptions: {}, point_values: {}, is_bonus: false, applies_to_categories: [], notes: "" },
  { name: "Dramatic Appropriateness", guidelines: "-Tone\n-Emotional depth\n-Character portrayal", weight_percent: 17, description_1: "Inappropriate tone", description_2: "Inconsistent tone", description_3: "Appropriate tone", description_4: "Strong dramatic choices", description_5: "Masterful interpretation", scale_descriptions: {}, point_values: {}, is_bonus: false, applies_to_categories: [], notes: "" },
  { name: "Literary Devices", guidelines: "-Metaphor\n-Imagery\n-Symbolism", weight_percent: 17, description_1: "No literary devices", description_2: "Basic device usage", description_3: "Adequate device usage", description_4: "Effective device usage", description_5: "Exceptional craft", scale_descriptions: {}, point_values: {}, is_bonus: false, applies_to_categories: [], notes: "" },
  { name: "Use of Language", guidelines: "-Word choice\n-Grammar\n-Vocabulary range", weight_percent: 16, description_1: "Poor word choice", description_2: "Basic vocabulary", description_3: "Competent language", description_4: "Rich language", description_5: "Extraordinary language", scale_descriptions: {}, point_values: {}, is_bonus: false, applies_to_categories: [], notes: "" },
  { name: "Continuity", guidelines: "-Flow\n-Transitions\n-Narrative arc", weight_percent: 16, description_1: "No coherent flow", description_2: "Occasional flow", description_3: "Generally cohesive", description_4: "Strong narrative arc", description_5: "Seamless and powerful", scale_descriptions: {}, point_values: {}, is_bonus: false, applies_to_categories: [], notes: "" },
];

/* ─── Point Value Input (supports single value or min-max range) ─── */
function PointValueInput({ control, index, scaleKey, compact }: { control: any; index: number; scaleKey: number; compact?: boolean }) {
  const fieldName = `criteria.${index}.point_values.${scaleKey}` as const;
  return (
    <Controller control={control} name={fieldName as any} render={({ field: f }) => {
      const val = f.value;
      const isRange = val && typeof val === "object" && "min" in val;
      const [rangeMode, setRangeMode] = useState(!!isRange);

      if (rangeMode) {
        const rangeVal = (typeof val === "object" && val !== null) ? val as { min: number; max: number } : { min: 0, max: 0 };
        return (
          <div className={compact ? "mt-1 space-y-0.5" : "space-y-0.5"}>
            <div className="flex items-center gap-1">
              <Input
                type="number" min={0}
                value={rangeVal.min || ""}
                onChange={(e) => f.onChange({ min: Number(e.target.value) || 0, max: rangeVal.max })}
                className={compact ? "h-5 text-[9px] font-mono flex-1" : "h-7 text-xs font-mono w-16"}
                placeholder="min"
              />
              <span className={compact ? "text-[9px] text-muted-foreground" : "text-xs text-muted-foreground"}>–</span>
              <Input
                type="number" min={0}
                value={rangeVal.max || ""}
                onChange={(e) => f.onChange({ min: rangeVal.min, max: Number(e.target.value) || 0 })}
                className={compact ? "h-5 text-[9px] font-mono flex-1" : "h-7 text-xs font-mono w-16"}
                placeholder="max"
              />
            </div>
            <button type="button" onClick={() => { setRangeMode(false); f.onChange(rangeVal.max || 0); }} className={`${compact ? "text-[8px]" : "text-[10px]"} text-muted-foreground hover:text-foreground underline`}>Single</button>
          </div>
        );
      }

      return (
        <div className={compact ? "mt-1 space-y-0.5" : "space-y-0.5"}>
          <Input
            type="number" min={0}
            value={typeof val === "number" ? val : (val || "")}
            onChange={(e) => f.onChange(Number(e.target.value) || 0)}
            className={compact ? "h-5 text-[9px] w-full font-mono" : "h-7 text-xs w-20 font-mono"}
            placeholder="pts"
          />
          <button type="button" onClick={() => { setRangeMode(true); f.onChange({ min: 0, max: typeof val === "number" ? val : 0 }); }} className={`${compact ? "text-[8px]" : "text-[10px]"} text-muted-foreground hover:text-foreground underline`}>Range</button>
        </div>
      );
    }} />
  );
}

/* ─── Sortable Table Row (Desktop) ─── */
function SortableTableRow({
  field,
  index,
  control,
  scalePoints,
  scaleLabels,
  weightMode,
  useCustomPoints,
  categories,
  onRemove,
  watchFn,
}: {
  field: { id: string };
  index: number;
  control: any;
  scalePoints: number[];
  scaleLabels: Record<string, string>;
  weightMode: "percent" | "points";
  useCustomPoints: boolean;
  categories: { id: string; name: string }[];
  onRemove: (i: number) => void;
  watchFn: any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isBonus = watchFn(`criteria.${index}.is_bonus`);
  const appliesTo = watchFn(`criteria.${index}.applies_to_categories`) || [];

  return (
    <TableRow ref={setNodeRef} style={style} className={`align-top ${isBonus ? "bg-amber-500/5" : ""}`}>
      <TableCell className="pt-3 cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground pt-3">{index + 1}</TableCell>
      <TableCell className="space-y-1.5">
        <Controller control={control} name={`criteria.${index}.name`} render={({ field: f, fieldState }) => (
          <Input {...f} className={`h-8 text-sm font-medium ${fieldState.error ? "border-destructive" : ""}`} placeholder="Criterion title" />
        )} />
        <Controller control={control} name={`criteria.${index}.guidelines`} render={({ field: f }) => (
          <Textarea {...f} className="text-xs min-h-[48px] resize-none" placeholder="Guidelines / subtext..." rows={2} />
        )} />
        <Controller control={control} name={`criteria.${index}.weight_percent`} render={({ field: f }) => (
          <div className="flex items-center gap-1.5">
            <Input {...f} type="number" min={0} className="h-7 text-xs w-20 font-mono" placeholder="0" />
            <span className="text-[10px] text-muted-foreground">{weightMode === "percent" ? "% weight" : "pts"}</span>
          </div>
        )} />
        <Controller control={control} name={`criteria.${index}.notes`} render={({ field: f }) => (
          <Textarea {...f} value={f.value || ""} className="text-xs min-h-[32px] resize-none" placeholder="Score card notes..." rows={1} />
        )} />
        <div className="flex items-center gap-3 pt-1">
          <Controller control={control} name={`criteria.${index}.is_bonus`} render={({ field: f }) => (
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={f.value} onCheckedChange={f.onChange} />
              <Star className="h-3 w-3 text-amber-500" /> Bonus
            </label>
          )} />
        </div>
        {(isBonus || appliesTo.length > 0) && categories.length > 0 && (
          <Controller control={control} name={`criteria.${index}.applies_to_categories`} render={({ field: f }) => (
            <div className="space-y-1 pt-1">
              <Label className="text-[10px] text-muted-foreground">Applies to categories:</Label>
              <div className="flex flex-wrap gap-1">
                {categories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-1 text-[10px] bg-muted/40 rounded px-1.5 py-0.5 cursor-pointer">
                    <Checkbox
                      checked={(f.value || []).includes(cat.id)}
                      onCheckedChange={(checked) => {
                        const current = f.value || [];
                        f.onChange(checked ? [...current, cat.id] : current.filter((c: string) => c !== cat.id));
                      }}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>
          )} />
        )}
      </TableCell>
      {scalePoints.map((n) => (
        <TableCell key={n}>
          {n <= 5 ? (
            <Controller control={control} name={`criteria.${index}.description_${n}` as any} render={({ field: f, fieldState }) => (
              <Textarea {...f} className={`text-xs min-h-[64px] resize-none ${fieldState.error ? "border-destructive" : ""}`} placeholder={`${scaleLabels[String(n)] || n}...`} rows={3} />
            )} />
          ) : (
            <Controller control={control} name={`criteria.${index}.scale_descriptions.${n}` as any} render={({ field: f }) => (
              <Textarea {...f} value={f.value || ""} className="text-xs min-h-[64px] resize-none" placeholder={`${scaleLabels[String(n)] || n}...`} rows={3} />
            )} />
          )}
          {useCustomPoints && (
            <PointValueInput control={control} index={index} scaleKey={n} compact />
          )}
        </TableCell>
      ))}
      <TableCell>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(index)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

/* ─── Sortable Accordion Item (Mobile) ─── */
function SortableAccordionCard({
  field,
  index,
  control,
  scalePoints,
  scaleLabels,
  weightMode,
  useCustomPoints,
  categories,
  nameVal,
  onRemove,
  watchFn,
}: {
  field: { id: string };
  index: number;
  control: any;
  scalePoints: number[];
  scaleLabels: Record<string, string>;
  weightMode: "percent" | "points";
  useCustomPoints: boolean;
  categories: { id: string; name: string }[];
  nameVal: string;
  onRemove: (i: number) => void;
  watchFn: any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isBonus = watchFn(`criteria.${index}.is_bonus`);
  const appliesTo = watchFn(`criteria.${index}.applies_to_categories`) || [];

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={field.id} className={`border border-border rounded-lg px-3 ${isBonus ? "bg-amber-500/10" : "bg-muted/20"}`}>
        <div className="flex items-center">
          <div className="cursor-grab py-3 pr-2 touch-none" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <AccordionTrigger className="py-3 text-sm flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
              <span className="font-medium">{nameVal || "Untitled Criterion"}</span>
              {isBonus && <Star className="h-3 w-3 text-amber-500" />}
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent className="space-y-3 pb-4">
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Controller control={control} name={`criteria.${index}.name`} render={({ field: f, fieldState }) => (
              <Input {...f} className={`h-8 text-sm ${fieldState.error ? "border-destructive" : ""}`} placeholder="Criterion title" />
            )} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Guidelines</Label>
            <Controller control={control} name={`criteria.${index}.guidelines`} render={({ field: f }) => (
              <Textarea {...f} className="text-xs min-h-[40px] resize-none" placeholder="Subtext / guidelines..." rows={2} />
            )} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{weightMode === "percent" ? "Weight %" : "Points"}</Label>
            <Controller control={control} name={`criteria.${index}.weight_percent`} render={({ field: f }) => (
              <Input {...f} type="number" min={0} className="h-8 text-xs w-24 font-mono" placeholder="0" />
            )} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Score Card Notes</Label>
            <Controller control={control} name={`criteria.${index}.notes`} render={({ field: f }) => (
              <Textarea {...f} value={f.value || ""} className="text-xs min-h-[32px] resize-none" placeholder="Notes shown on score cards..." rows={1} />
            )} />
          </div>
          <div className="flex items-center gap-3">
            <Controller control={control} name={`criteria.${index}.is_bonus`} render={({ field: f }) => (
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={f.value} onCheckedChange={f.onChange} />
                <Star className="h-3 w-3 text-amber-500" /> Bonus criterion
              </label>
            )} />
          </div>
          {(isBonus || appliesTo.length > 0) && categories.length > 0 && (
            <Controller control={control} name={`criteria.${index}.applies_to_categories`} render={({ field: f }) => (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Applies to categories:</Label>
                <div className="flex flex-wrap gap-1">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-1 text-[10px] bg-muted/40 rounded px-1.5 py-0.5 cursor-pointer">
                      <Checkbox
                        checked={(f.value || []).includes(cat.id)}
                        onCheckedChange={(checked) => {
                          const current = f.value || [];
                          f.onChange(checked ? [...current, cat.id] : current.filter((c: string) => c !== cat.id));
                        }}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            )} />
          )}
          {scalePoints.map((n) => (
            <div key={n} className="space-y-1">
              <Label className="text-xs">
                <span className="font-mono text-primary mr-1">{n}</span>
                {scaleLabels[String(n)] || `Point ${n}`}
              </Label>
              {n <= 5 ? (
                <Controller control={control} name={`criteria.${index}.description_${n}` as any} render={({ field: f, fieldState }) => (
                  <Textarea {...f} className={`text-xs min-h-[48px] resize-none ${fieldState.error ? "border-destructive" : ""}`} placeholder={`Describe ${scaleLabels[String(n)] || n}...`} rows={2} />
                )} />
              ) : (
                <Controller control={control} name={`criteria.${index}.scale_descriptions.${n}` as any} render={({ field: f }) => (
                  <Textarea {...f} value={f.value || ""} className="text-xs min-h-[48px] resize-none" placeholder={`Describe ${scaleLabels[String(n)] || n}...`} rows={2} />
                )} />
              )}
              {useCustomPoints && (
                <PointValueInput control={control} index={index} scaleKey={n} />
              )}
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => onRemove(index)}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

/* ─── Main Component ─── */
export function RubricBuilder({ competitionId }: { competitionId: string }) {
  const isMobile = useIsMobile();
  const { data: criteria, isLoading: criteriaLoading } = useRubricCriteria(competitionId);
  const { data: competition } = useCompetition(competitionId);
  const createCriterion = useCreateRubricCriterion();
  const updateCriterion = useUpdateRubricCriterion();
  const deleteCriterion = useDeleteRubricCriterion();
  const updateCompetition = useUpdateCompetition();

  const existingScaleLabels = (competition as any)?.rubric_scale_labels as RubricScaleLabels | undefined;
  const existingWeightMode = ((competition as any)?.rubric_weight_mode || "percent") as "percent" | "points";

  const [scaleSize, setScaleSize] = useState(5);
  const [weightMode, setWeightMode] = useState<"percent" | "points">(existingWeightMode);
  const [useCustomPoints, setUseCustomPoints] = useState(false);

  // Fetch categories for the competition
  const { data: allCategories } = useQuery({
    queryKey: ["all_categories", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data: levels } = await supabase.from("competition_levels").select("id").eq("competition_id", competitionId);
      if (!levels?.length) return [];
      const { data } = await supabase.from("competition_categories").select("id, name").in("level_id", levels.map(l => l.id));
      return (data || []) as { id: string; name: string }[];
    },
  });
  const categories = allCategories || [];

  const scalePoints = useMemo(() => Array.from({ length: scaleSize }, (_, i) => i + 1), [scaleSize]);

  const form = useForm<RubricFormValues>({
    resolver: zodResolver(rubricSchema),
    defaultValues: { scaleLabels: DEFAULT_SCALE_LABELS, criteria: [] },
  });

  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "criteria" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (existingScaleLabels?.labels) {
      form.setValue("scaleLabels", existingScaleLabels.labels as any);
      const max = existingScaleLabels.max || 5;
      setScaleSize(max);
    }
  }, [existingScaleLabels]);

  useEffect(() => {
    setWeightMode(existingWeightMode);
  }, [existingWeightMode]);

  useEffect(() => {
    if (criteria && criteria.length > 0) {
      const hasCustomPoints = criteria.some(c => Object.keys(c.point_values || {}).length > 0);
      setUseCustomPoints(hasCustomPoints);
      form.setValue("criteria", criteria.map((c) => ({
        id: c.id, name: c.name, guidelines: c.guidelines || "",
        weight_percent: c.weight_percent ?? 0,
        description_1: c.description_1, description_2: c.description_2, description_3: c.description_3,
        description_4: c.description_4, description_5: c.description_5,
        scale_descriptions: c.scale_descriptions || {},
        point_values: c.point_values || {},
        is_bonus: c.is_bonus || false,
        applies_to_categories: c.applies_to_categories || [],
        notes: c.notes || "",
      })));
    }
  }, [criteria]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex);
    }
  }, [fields, move]);

  const handleLoadDefaults = useCallback(() => {
    form.setValue("scaleLabels", DEFAULT_SCALE_LABELS);
    setScaleSize(5);
    form.setValue("criteria", DEFAULT_CRITERIA.map((c) => ({ ...c })));
  }, [form]);

  const handleAddCriterion = useCallback(() => {
    append({
      name: "", guidelines: "", weight_percent: 0,
      description_1: "", description_2: "", description_3: "", description_4: "", description_5: "",
      scale_descriptions: {}, point_values: {}, is_bonus: false, applies_to_categories: [], notes: "",
    });
  }, [append]);

  const handleAddScale = () => {
    if (scaleSize >= 10) return;
    const newSize = scaleSize + 1;
    setScaleSize(newSize);
    form.setValue(`scaleLabels.${newSize}`, `Level ${newSize}`);
  };

  const handleRemoveScale = () => {
    if (scaleSize <= 2) return;
    const labels = { ...form.getValues("scaleLabels") };
    delete labels[String(scaleSize)];
    form.setValue("scaleLabels", labels);
    setScaleSize(scaleSize - 1);
  };

  const onSubmit = async (values: RubricFormValues) => {
    // Save scale labels and weight mode
    updateCompetition.mutate({
      id: competitionId,
      rubric_scale_labels: { min: 1, max: scaleSize, labels: values.scaleLabels },
      rubric_weight_mode: weightMode,
    } as any);

    const existingIds = new Set(criteria?.map((c) => c.id) || []);
    const formIds = new Set(values.criteria.map((c) => c.id).filter(Boolean));

    for (const c of criteria || []) {
      if (!formIds.has(c.id)) deleteCriterion.mutate({ id: c.id, competition_id: competitionId });
    }

    for (let i = 0; i < values.criteria.length; i++) {
      const c = values.criteria[i];
      const data: any = {
        competition_id: competitionId, name: c.name, guidelines: c.guidelines || null, sort_order: i,
        weight_percent: c.weight_percent ?? 0,
        description_1: c.description_1 || "", description_2: c.description_2 || "", description_3: c.description_3 || "",
        description_4: c.description_4 || "", description_5: c.description_5 || "",
        scale_descriptions: c.scale_descriptions || {},
        point_values: useCustomPoints ? (c.point_values || {}) : {},
        is_bonus: c.is_bonus || false,
        applies_to_categories: c.applies_to_categories || [],
        notes: c.notes || null,
      };
      if (c.id && existingIds.has(c.id)) updateCriterion.mutate({ id: c.id, ...data });
      else createCriterion.mutate(data);
    }

    toast({ title: "Rubric saved", description: `${values.criteria.length} criteria saved successfully.` });
  };

  const scaleLabels = form.watch("scaleLabels");
  const watchedCriteria = form.watch("criteria");
  const totalWeight = (watchedCriteria || []).reduce((sum, c) => sum + (Number(c.weight_percent) || 0), 0);

  if (criteriaLoading) return <Card className="border-border/50 bg-card/80 animate-pulse h-48" />;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-secondary" />
            Scoring Rubric
          </CardTitle>
          <div className="flex gap-2">
            {fields.length === 0 && (
              <Button variant="outline" size="sm" onClick={handleLoadDefaults}>
                <Wand2 className="h-3 w-3 mr-1" /> Load Template
              </Button>
            )}
            <Button size="sm" onClick={form.handleSubmit(onSubmit)} disabled={createCriterion.isPending || updateCriterion.isPending}>
              <Save className="h-3 w-3 mr-1" /> Save Rubric
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scale Labels with dynamic size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Scale Labels (1–{scaleSize})
            </Label>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={handleRemoveScale} disabled={scaleSize <= 2}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs font-mono w-6 text-center">{scaleSize}</span>
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={handleAddScale} disabled={scaleSize >= 10}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {scalePoints.map((n) => (
              <div key={n} className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">Point {n}</Label>
                <Controller control={form.control} name={`scaleLabels.${n}`} render={({ field, fieldState }) => (
                  <Input {...field} value={field.value || ""} className={`h-8 text-sm ${fieldState.error ? "border-destructive" : ""}`} placeholder={`Label for ${n}`} />
                )} />
              </div>
            ))}
          </div>
        </div>

        {/* Mode toggles */}
        <div className="flex flex-wrap items-center gap-4 border border-border/50 rounded-lg p-3 bg-muted/20">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Switch checked={weightMode === "points"} onCheckedChange={(v) => setWeightMode(v ? "points" : "percent")} />
            {weightMode === "percent" ? "% Weight" : "Points"}
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Switch checked={useCustomPoints} onCheckedChange={setUseCustomPoints} />
            Custom points per scale level
          </label>
        </div>

        {/* Criteria — Desktop Grid with DnD */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            {!isMobile && fields.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10" />
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="min-w-[180px]">Criterion</TableHead>
                      {scalePoints.map((n) => (
                        <TableHead key={n} className="min-w-[140px] text-center">
                          <div className="font-mono text-xs text-primary">{n}</div>
                          <div className="text-xs text-muted-foreground truncate">{scaleLabels[String(n)] || `Point ${n}`}</div>
                        </TableHead>
                      ))}
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <SortableTableRow
                        key={field.id}
                        field={field}
                        index={index}
                        control={form.control}
                        scalePoints={scalePoints}
                        scaleLabels={scaleLabels}
                        weightMode={weightMode}
                        useCustomPoints={useCustomPoints}
                        categories={categories}
                        onRemove={remove}
                        watchFn={form.watch}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Criteria — Mobile Accordion with DnD */}
            {isMobile && fields.length > 0 && (
              <Accordion type="multiple" className="space-y-2">
                {fields.map((field, index) => {
                  const nameVal = form.watch(`criteria.${index}.name`);
                  return (
                    <SortableAccordionCard
                      key={field.id}
                      field={field}
                      index={index}
                      control={form.control}
                      scalePoints={scalePoints}
                      scaleLabels={scaleLabels}
                      weightMode={weightMode}
                      useCustomPoints={useCustomPoints}
                      categories={categories}
                      nameVal={nameVal || ""}
                      onRemove={remove}
                      watchFn={form.watch}
                    />
                  );
                })}
              </Accordion>
            )}
          </SortableContext>
        </DndContext>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handleAddCriterion}>
            <Plus className="h-4 w-4 mr-1" /> Add Criterion
          </Button>
          {fields.length > 0 && (
            <div className={`text-xs font-mono px-2 py-1 rounded ${
              weightMode === "percent"
                ? totalWeight === 100 ? "bg-primary/10 text-primary" : totalWeight > 0 ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
                : "bg-primary/10 text-primary"
            }`}>
              {weightMode === "percent"
                ? <>Weight total: {totalWeight}%{totalWeight > 0 && totalWeight !== 100 && " (should be 100%)"}</>
                : <>Total points: {totalWeight}</>
              }
            </div>
          )}
        </div>

        {form.formState.errors.criteria && typeof form.formState.errors.criteria.message === "string" && (
          <p className="text-xs text-destructive">{form.formState.errors.criteria.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
