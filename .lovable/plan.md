## Goal

After the chief-judge has resolved tie-breaks (or completed deliberation), allow **chief judges AND tabulators** to manually re-order the final placements shown in:

1. The **Chief Judge panel** (Ties tab → extended into a full "Final Order" tool).
2. The **Leaderboard** (`LeaderboardSection`) used by the tabulator / admin views.

The original calculated rank (Olympic / chosen scoring method) and each judge's own placement must be preserved and visible — the override only changes the displayed *final placement* column.

## Data model

Add a new JSONB column on `chief_judge_certifications`:

- `final_placement_order jsonb NOT NULL DEFAULT '[]'::jsonb`
  - Shape: `[{ regId: uuid, rank: int, calculatedRank: int, reason?: string }]`
  - One entry per contestant in the sub-event (full ordering, not just ties).
- `final_order_locked boolean NOT NULL DEFAULT false`
  - Set to `true` automatically when the cert is signed; locked rows cannot be changed except by admin/organizer.
- `final_order_updated_by uuid` and `final_order_updated_at timestamptz` for audit.

RLS already covers cert table — extend the existing chief-judge / admin / organizer ALL policy so **tabulators** can also update only the new placement columns:

```sql
CREATE POLICY "Tabulators can adjust final placement order"
ON chief_judge_certifications FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'tabulator'))
WITH CHECK (has_role(auth.uid(), 'tabulator'));
```

(Application code will only mutate the placement columns; everything else still requires chief / admin.)

## UI: Chief Judge Dashboard

Rename the **Ties** tab to **"Ties & Final Order"** (or add a new "Final Order" tab). Below the existing `TieBreaker`:

- Render a `FinalOrderEditor` listing every contestant in calculated order with two columns:
  - **Calculated** (read-only badge: e.g. "Calc #3")
  - **Final** (current placement, draggable when not locked)
- Drag-and-drop (re-use the `dnd-kit` pattern from `TieBreaker.tsx`).
- Optional `reason` textarea per change.
- "Save Final Order" button writes to `chief_judge_certifications.final_placement_order` via the existing `useUpsertCertification` mutation.
- When `is_certified = true` → list becomes read-only with a "Locked" badge unless the user is admin / organizer.

## UI: Leaderboard (`src/components/competition/LeaderboardSection.tsx`)

- Fetch the per-sub-event certifications for the selected level (single query: `chief_judge_certifications` filtered by `sub_event_id IN (...)`) and merge `final_placement_order` into a `Map<regId, finalRank>`.
- When building rows:
  - Compute `calculatedRank` from the existing sort (avgFinal desc, allJudgesRawTotal desc).
  - If a final-order override exists for the row's sub-event, use it as the displayed rank; otherwise use calculated rank.
  - Sort displayed rows by `finalRank ?? calculatedRank`.
- Add a new column **"Calc"** (small muted badge) next to the existing **Rank** column so the original calculation stays visible.
- Add an **"Edit Final Order"** button visible to `tabulator | admin | organizer`. Clicking opens a modal (similar to `ContestantReorderModal`) that lets them drag rows; on save, the per sub-event `final_placement_order` is upserted on the corresponding `chief_judge_certifications` row (creating one with the editing user as `chief_judge_id` only if the column policy allows — otherwise they call a small RPC).
- A small "Final order overridden" pill appears in the header when any row uses a manual placement.
- Google Sheets export already uses display order — it will pick up the override automatically; we'll also add a `Calculated Rank` column so the export records both numbers.

## RPC for tabulator overrides

To keep RLS simple and allow tabulators to set the placement without owning the certification row, add:

```sql
create or replace function public.set_final_placement_order(
  _sub_event_id uuid,
  _order jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_any_role(auth.uid(),
       array['tabulator','chief_judge','admin','organizer']::app_role[]) then
    raise exception 'Permission denied';
  end if;

  insert into chief_judge_certifications
    (sub_event_id, chief_judge_id, final_placement_order,
     final_order_updated_by, final_order_updated_at)
  values
    (_sub_event_id, auth.uid(), _order, auth.uid(), now())
  on conflict (sub_event_id) do update
    set final_placement_order   = excluded.final_placement_order,
        final_order_updated_by  = auth.uid(),
        final_order_updated_at  = now()
   where chief_judge_certifications.is_certified = false
      or has_any_role(auth.uid(), array['admin','organizer']::app_role[]);
end; $$;
```

(Uses the existing `unique(sub_event_id)` index on certifications — we will add it if missing.)

## Files to add / change

- **Migration**: new columns + RPC + (if needed) unique index on `chief_judge_certifications.sub_event_id`.
- **`src/hooks/useChiefJudge.ts`**: extend `ChiefJudgeCertification` type, expose `useSetFinalPlacementOrder` mutation that calls the new RPC.
- **New `src/components/chief-judge/FinalOrderEditor.tsx`**: drag-and-drop list reusing dnd-kit; shows calculated vs final rank.
- **`src/pages/ChiefJudgeDashboard.tsx`**: mount the new editor under the Ties tab.
- **`src/components/competition/LeaderboardSection.tsx`**:
  - Fetch certifications, merge override into `rows`.
  - Add `calculatedRank` to `RowData`.
  - Add "Calc" column + "Edit Final Order" button + reorder modal (re-using a slimmed `ContestantReorderModal`-like component that persists via the RPC instead of `sort_order`).

## Out of scope

- Changing `contestant_registrations.sort_order` (that controls performance order, not placement).
- Touching individual judge sheets — judge raw scores and per-judge ranks stay untouched.
- Special awards / People's Choice ordering.

## Acceptance

- A tabulator on the Leaderboard can drag a contestant from #4 to #2; the page re-renders showing **Final #2 / Calc #4** for that row, while every other row keeps both numbers consistent.
- Reload / other users see the same order in real time (cert subscription already exists).
- Once the chief judge signs the certification, the editor goes read-only for non-admins.
- Google Sheets export contains both `Rank` (final, manual) and `Calculated Rank` columns.
