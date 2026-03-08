

## Fix Blank Rendering in Browser Automation

The app appears blank in headless browser testing due to two compounding issues:

1. **CSS `filter` always applied**: The `auditorium-filter` class applies `brightness()` and `contrast()` CSS filters to the entire page even at default 100% values. Some headless browsers have poor support for CSS `filter` on root-level elements, causing the page to render as blank or invisible.

2. **Dark theme default**: The theme initializes to `isDark = true` before reading `localStorage`, meaning the very first paint is a near-black background (`hsl(220 20% 6%)`). Combined with the filter issue, this results in an invisible page.

---

### Fix 1: Conditionally apply auditorium filter

**File: `src/contexts/ThemeContext.tsx`**

- Only set the CSS custom properties when brightness or contrast differ from 100 (default). When at defaults, clear the properties so no `filter` is applied.

### Fix 2: Remove filter class when at defaults

**File: `src/components/AppLayout.tsx` and `src/pages/Auth.tsx`**

- Make the `auditorium-filter` class conditional: only add it when brightness or contrast are non-default values. This prevents the CSS `filter` from being applied unnecessarily.
- Import `useTheme` and check `brightness !== 100 || contrast !== 100` before adding the class.

### Fix 3: Update CSS to use filter only when properties exist

**File: `src/index.css`**

- Change `.auditorium-filter` to only apply filter when the custom properties are actually set, using a fallback of `none`:

```css
.auditorium-filter {
  filter: var(--auditorium-brightness, none) var(--auditorium-contrast, none);
}
```

This ensures no filter is applied when properties are unset, which is the default state.

---

### Summary

- Modified: `src/index.css`, `src/contexts/ThemeContext.tsx`, `src/components/AppLayout.tsx`, `src/pages/Auth.tsx`
- No database or backend changes needed
- The auditorium filter will still work exactly as before when the user adjusts brightness/contrast sliders -- it simply won't apply an identity filter at defaults

