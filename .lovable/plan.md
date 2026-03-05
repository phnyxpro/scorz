

## Plan: Add Icon and Description to Rubric Tab Card

Update the Rubric Document card header in `CompetitionDetail.tsx` (line 234) to match the Rules tab pattern -- add a `BookOpen` icon and a `CardDescription`.

### Change

**File: `src/pages/CompetitionDetail.tsx`**

Replace line 234:
```tsx
<CardHeader><CardTitle className="text-base">Rubric Document</CardTitle></CardHeader>
```

With:
```tsx
<CardHeader>
  <div className="flex items-center gap-2">
    <BookOpen className="h-5 w-5 text-primary" />
    <CardTitle className="text-base">Scoring Rubric</CardTitle>
  </div>
  <CardDescription>Upload a rubric PDF or build scoring criteria below for judges to use during evaluation.</CardDescription>
</CardHeader>
```

Also add `BookOpen` to the existing lucide-react import.

Single file change, no database modifications.

