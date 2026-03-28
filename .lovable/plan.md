

# Add Category/Subcategory Fields to Registration Form

## Overview
Add category and subcategory selection to both the registration form config (RegistrationFormsInline) and the actual registration form (ContestantRegistration), so contestants can pick their category path (e.g., "Contemporary > Solo > Male 11-15") when levels use a category structure.

## Changes

### 1. RegistrationFormsInline — Add new fields to Event Details section
**File:** `src/components/competition/RegistrationFormsInline.tsx`
- Add `category` and `subCategory` field definitions to the "event" section alongside level/subEvent
- Add them to `DEFAULT_CONFIG` with `enabled: true, required: false`
- Labels: "Category" and "Sub-Category"

### 2. Registration Form Schema — Add category fields
**File:** `src/pages/ContestantRegistration.tsx`
- Add `selectedCategoryId` and `selectedSubCategoryId` to the zod schema and form defaults
- Extract `useCategories` from CategoriesPanel into a shared hook or inline query in EventStep

### 3. EventStep — Category/Subcategory UI
**File:** `src/pages/ContestantRegistration.tsx` (EventStep component)
- When the selected level has `structure_type === 'categories'`, show a cascading category picker instead of the flat sub-event list:
  1. Show top-level categories as selectable buttons/chips
  2. Once a category is selected, show its children (subcategories)
  3. Continue drilling until a leaf category is reached, then auto-select its linked `sub_event_id`
- When level uses `structure_type === 'sub_events'`, keep existing flat sub-event picker
- Respect the form config: only show category/subCategory fields if enabled in `registration_form_config`

### 4. Save category on registration record
**File:** `src/pages/ContestantRegistration.tsx` (onSubmit)
- The leaf category's `sub_event_id` is already stored on the registration
- No DB migration needed — the category selection just determines which sub_event_id gets saved

### Files Modified
| File | Change |
|------|--------|
| `src/components/competition/RegistrationFormsInline.tsx` | Add category/subCategory fields to Event Details config |
| `src/pages/ContestantRegistration.tsx` | Add category cascade picker to EventStep, schema updates |

