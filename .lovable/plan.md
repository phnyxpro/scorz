

## Fix: Alicia Reyes Time Penalty Not Applied

### Root Cause Analysis

**Two distinct bugs** are preventing the penalty from applying:

### Bug 1: Penalty rule boundary gap in the database

The current penalty rules for competition `04b250a2` have incorrect boundaries:

| Tier | from_seconds | to_seconds | penalty |
|------|-------------|------------|---------|
| Tier 1 | 256 | 265 | 4 pts |
| Tier 2 | 266 | **278** | 8 pts |
| Tier 3 | **279** | null | 16 pts |

Alicia's duration is **278.381 seconds** (4:38.381). This falls **between** tiers because:
- `278.381 > 278` so Tier 2 doesn't match (`durationSecs <= rule.to_seconds` fails)
- `278.381 < 279` so Tier 3 doesn't match either (`durationSecs >= rule.from_seconds` fails)

The correct boundaries per the user's rules (4:26-4:37 = 8pts, 4:38+ = 16pts):
- 4:37 = 277 seconds, so Tier 2 `to_seconds` should be **277**
- 4:38 = 278 seconds, so Tier 3 `from_seconds` should be **278**

**Fix:** Update two penalty_rules rows via SQL:
- Set Tier 2 `to_seconds` from 278 to **277**
- Set Tier 3 `from_seconds` from 279 to **278**

### Bug 2: Fractional seconds comparison in `calculatePenalty`

Even after fixing boundaries, comparing `278.381` against integer `to_seconds` values will create edge-case mismatches. The `calculatePenalty` function should **floor** the duration before comparison.

**Fix in `src/pages/JudgeScoring.tsx`** (~line 182):
```typescript
const calculatePenalty = useCallback((durationSecs: number): number => {
    if (!penalties?.length) return 0;
    const rounded = Math.floor(durationSecs); // floor to whole seconds
    const overTime = rounded - timeLimitSecs - gracePeriodSecs;
    if (overTime <= 0) return 0;
    let totalPenalty = 0;
    for (const rule of penalties) {
      if (rounded >= rule.from_seconds) {
        if (!rule.to_seconds || rounded <= rule.to_seconds) {
          totalPenalty = Math.max(totalPenalty, rule.penalty_points);
        }
      }
    }
    return totalPenalty;
  }, [penalties, timeLimitSecs, gracePeriodSecs]);
```

### Bug 3: Existing scores need re-saving

The 5 judge_scores rows for Alicia all have `time_penalty: 0` and `final_score = raw_total`. After the fix, judges would need to re-save or an admin batch update is needed. The `recalculate_final_score` trigger already handles `final_score = raw_total - time_penalty`, so updating `time_penalty` on these rows will auto-fix `final_score`.

### Summary of changes:
1. **Database migration**: Fix penalty rule boundaries (Tier 2 to_seconds: 277, Tier 3 from_seconds: 278)
2. **`src/pages/JudgeScoring.tsx`**: Floor duration before penalty comparison
3. **Database migration**: Batch-update existing Alicia Reyes scores to apply the correct penalty (update `time_penalty` column; the trigger recalculates `final_score`)

