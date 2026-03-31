
Goal: make conditional logic actually work for every field that has it applied, in both the form-builder preview modal and the real registration / Add Registration forms.

1. Unify conditional logic mapping from builder config
- Update both schema conversion paths:
  - `src/components/competition/RegistrationFormsInline.tsx` (`builderConfigToFormSchema`)
  - `src/hooks/useRegistrationForm.ts` (Format C flat-config conversion)
- Today they only translate `logic.show_when` for repeater children.
- I’ll extend them to also translate top-level field conditions into `showWhen`.
- I’ll resolve `field_id` to the correct rendered key using the same built-in key mapping already used elsewhere, so dependencies work for both built-in and custom fields.

2. Support all operators consistently
- The builder currently allows:
  - `equals`
  - `not_equals`
  - `contains`
  - `not_empty`
- But runtime `showWhen` only supports a simplified `{ fieldKey, equals }` behavior.
- I’ll expand the runtime conditional model to preserve the operator, then update:
  - top-level section filtering
  - repeater sub-field filtering
  - section validation
- Result:
  - hidden fields stay hidden by default
  - fields only appear when their actual condition evaluates true
  - required hidden fields won’t block submit

3. Fix preview parity with live forms
- The screenshot shows the preview modal still rendering all dance-style dropdowns.
- That is because preview uses `builderConfigToFormSchema`, which currently drops most top-level logic.
- After the mapping/runtime changes, the preview modal and the actual “Add Registration” dialog will use the same effective conditional behavior.

4. Protect dependent selector/value edge cases
- For selectors like category / subcategory and dynamic repeaters, I’ll preserve the current ID + name matching approach where needed, but make it work through the new operator-aware condition evaluator.
- This avoids regressions where a condition compares against either a stored id or a human-readable label.

5. Keep save behavior aligned with your earlier request
- No backend/schema changes are needed.
- The existing save toast in `RegistrationFormsInline.tsx` already confirms the form is live for:
  - Add Registration
  - contestant sign-up
- I’ll keep that message aligned while making the actual conditional logic now match that confirmation.

6. Files to update
- `src/hooks/useRegistrationForm.ts`
- `src/components/competition/RegistrationFormsInline.tsx`
- `src/components/registration/DynamicRegistrationForm.tsx`

Technical details
- Root cause:
  - flat builder configs store conditions in `field.logic.show_when`
  - runtime form rendering expects `field.showWhen`
  - conversion currently maps repeater-child logic only, not normal fields
- Secondary issue:
  - runtime ignores `not_equals` and `not_empty`, even though the builder supports them
- Proposed shape:
```text
showWhen: {
  fieldKey: string
  operator: "equals" | "not_equals" | "contains" | "not_empty"
  value?: string
}
```
- Evaluation will be centralized so preview, walk-in, and registration modes behave the same.

Validation checklist after implementation
- In form preview modal:
  - no dance class selected -> all dance-style dropdowns hidden
  - selecting a dance class -> only its matching dance-style dropdown appears
- In “Add Registration” dialog:
  - same behavior as preview
- In contestant public registration:
  - same behavior as preview
- Hidden required conditional fields do not trigger validation errors until shown
