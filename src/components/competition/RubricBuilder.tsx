import { useEffect, useCallback } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, GripVertical, Wand2, Save, BookOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";

const SCALE_POINTS = [1, 2, 3, 4, 5] as const;

const criterionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Title is required"),
  guidelines: z.string().optional(),
  weight_percent: z.coerce.number().min(0).max(100).default(0),
  description_1: z.string().min(1, "Required"),
  description_2: z.string().min(1, "Required"),
  description_3: z.string().min(1, "Required"),
  description_4: z.string().min(1, "Required"),
  description_5: z.string().min(1, "Required"),
});

const rubricSchema = z.object({
  scaleLabels: z.object({
    "1": z.string().min(1, "Required"),
    "2": z.string().min(1, "Required"),
    "3": z.string().min(1, "Required"),
    "4": z.string().min(1, "Required"),
    "5": z.string().min(1, "Required"),
  }),
  criteria: z.array(criterionSchema).min(1, "At least one criterion is required"),
});

type RubricFormValues = z.infer<typeof rubricSchema>;

const DEFAULT_SCALE_LABELS = { "1": "Very Weak", "2": "Weak", "3": "Average", "4": "Good", "5": "Excellent" };

const DEFAULT_CRITERIA: Omit<RubricFormValues["criteria"][number], "id">[] = [
  { name: "Voice & Articulation", guidelines: "-Range of voice\n-Clarity of words (Diction)", description_1: "Inaudible or unintelligible", description_2: "Occasionally unclear", description_3: "Generally clear", description_4: "Clear and expressive", description_5: "Exceptional vocal command" },
  { name: "Stage Presence", guidelines: "-Confidence\n-Eye contact\n-Movement", description_1: "No engagement", description_2: "Minimal engagement", description_3: "Adequate presence", description_4: "Commanding presence", description_5: "Captivating throughout" },
  { name: "Dramatic Appropriateness", guidelines: "-Tone\n-Emotional depth\n-Character portrayal", description_1: "Inappropriate tone", description_2: "Inconsistent tone", description_3: "Appropriate tone", description_4: "Strong dramatic choices", description_5: "Masterful interpretation" },
  { name: "Literary Devices", guidelines: "-Metaphor\n-Imagery\n-Symbolism", description_1: "No literary devices", description_2: "Basic device usage", description_3: "Adequate device usage", description_4: "Effective device usage", description_5: "Exceptional craft" },
  { name: "Use of Language", guidelines: "-Word choice\n-Grammar\n-Vocabulary range", description_1: "Poor word choice", description_2: "Basic vocabulary", description_3: "Competent language", description_4: "Rich language", description_5: "Extraordinary language" },
  { name: "Continuity", guidelines: "-Flow\n-Transitions\n-Narrative arc", description_1: "No coherent flow", description_2: "Occasional flow", description_3: "Generally cohesive", description_4: "Strong narrative arc", description_5: "Seamless and powerful" },
];

/* ─── Sortable Table Row (Desktop) ─── */
function SortableTableRow({
  field,
  index,
  control,
  scaleLabels,
  onRemove,
}: {
  field: { id: string };
  index: number;
  control: any;
  scaleLabels: Record<string, string>;
  onRemove: (i: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="align-top">
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
            <Input {...f} type="number" min={0} max={100} className="h-7 text-xs w-20 font-mono" placeholder="0" />
            <span className="text-[10px] text-muted-foreground">% weight</span>
          </div>
        )} />
      </TableCell>
      {SCALE_POINTS.map((n) => (
        <TableCell key={n}>
          <Controller control={control} name={`criteria.${index}.description_${n}` as any} render={({ field: f, fieldState }) => (
            <Textarea {...f} className={`text-xs min-h-[64px] resize-none ${fieldState.error ? "border-destructive" : ""}`} placeholder={`${scaleLabels[String(n)] || n}...`} rows={3} />
          )} />
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
  scaleLabels,
  nameVal,
  onRemove,
}: {
  field: { id: string };
  index: number;
  control: any;
  scaleLabels: Record<string, string>;
  nameVal: string;
  onRemove: (i: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={field.id} className="border border-border rounded-lg px-3 bg-muted/20">
        <div className="flex items-center">
          <div className="cursor-grab py-3 pr-2 touch-none" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <AccordionTrigger className="py-3 text-sm flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
              <span className="font-medium">{nameVal || "Untitled Criterion"}</span>
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
            <Label className="text-xs">Weight %</Label>
            <Controller control={control} name={`criteria.${index}.weight_percent`} render={({ field: f }) => (
              <Input {...f} type="number" min={0} max={100} className="h-8 text-xs w-24 font-mono" placeholder="0" />
            )} />
          </div>
          {SCALE_POINTS.map((n) => (
            <div key={n} className="space-y-1">
              <Label className="text-xs">
                <span className="font-mono text-primary mr-1">{n}</span>
                {scaleLabels[String(n)] || `Point ${n}`}
              </Label>
              <Controller control={control} name={`criteria.${index}.description_${n}` as any} render={({ field: f, fieldState }) => (
                <Textarea {...f} className={`text-xs min-h-[48px] resize-none ${fieldState.error ? "border-destructive" : ""}`} placeholder={`Describe ${scaleLabels[String(n)] || n}...`} rows={2} />
              )} />
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
    }
  }, [existingScaleLabels]);

  useEffect(() => {
    if (criteria && criteria.length > 0) {
      form.setValue("criteria", criteria.map((c) => ({
        id: c.id, name: c.name, guidelines: c.guidelines || "",
        weight_percent: c.weight_percent ?? 0,
        description_1: c.description_1, description_2: c.description_2, description_3: c.description_3,
        description_4: c.description_4, description_5: c.description_5,
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
    form.setValue("criteria", DEFAULT_CRITERIA.map((c) => ({ ...c })));
  }, [form]);

  const handleAddCriterion = useCallback(() => {
    append({ name: "", guidelines: "", weight_percent: 0, description_1: "", description_2: "", description_3: "", description_4: "", description_5: "" });
  }, [append]);

  const onSubmit = async (values: RubricFormValues) => {
    const payload = {
      scale: { min: 1, max: 5, labels: values.scaleLabels },
      criteria: values.criteria.map((c, i) => ({
        title: c.name, guidelines: c.guidelines || "", sort_order: i,
        descriptions: { "1": c.description_1, "2": c.description_2, "3": c.description_3, "4": c.description_4, "5": c.description_5 },
      })),
    };
    console.log("Rubric Schema JSON:", JSON.stringify(payload, null, 2));

    updateCompetition.mutate({ id: competitionId, rubric_scale_labels: values.scaleLabels } as any);

    const existingIds = new Set(criteria?.map((c) => c.id) || []);
    const formIds = new Set(values.criteria.map((c) => c.id).filter(Boolean));

    for (const c of criteria || []) {
      if (!formIds.has(c.id)) deleteCriterion.mutate({ id: c.id, competition_id: competitionId });
    }

    for (let i = 0; i < values.criteria.length; i++) {
      const c = values.criteria[i];
      const data = {
        competition_id: competitionId, name: c.name, guidelines: c.guidelines || null, sort_order: i,
        weight_percent: c.weight_percent ?? 0,
        description_1: c.description_1, description_2: c.description_2, description_3: c.description_3,
        description_4: c.description_4, description_5: c.description_5,
      };
      if (c.id && existingIds.has(c.id)) updateCriterion.mutate({ id: c.id, ...data });
      else createCriterion.mutate(data as any);
    }

    toast({ title: "Rubric saved", description: `${values.criteria.length} criteria saved successfully.` });
  };

  const scaleLabels = form.watch("scaleLabels");

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
        {/* Scale Labels */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Scale Labels (1–5)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SCALE_POINTS.map((n) => (
              <div key={n} className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">Point {n}</Label>
                <Controller control={form.control} name={`scaleLabels.${n}`} render={({ field, fieldState }) => (
                  <Input {...field} className={`h-8 text-sm ${fieldState.error ? "border-destructive" : ""}`} placeholder={`Label for ${n}`} />
                )} />
              </div>
            ))}
          </div>
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
                      {SCALE_POINTS.map((n) => (
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
                      <SortableTableRow key={field.id} field={field} index={index} control={form.control} scaleLabels={scaleLabels} onRemove={remove} />
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
                    <SortableAccordionCard key={field.id} field={field} index={index} control={form.control} scaleLabels={scaleLabels} nameVal={nameVal || ""} onRemove={remove} />
                  );
                })}
              </Accordion>
            )}
          </SortableContext>
        </DndContext>

        <Button variant="outline" size="sm" onClick={handleAddCriterion} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Criterion
        </Button>

        {form.formState.errors.criteria && typeof form.formState.errors.criteria.message === "string" && (
          <p className="text-xs text-destructive">{form.formState.errors.criteria.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
