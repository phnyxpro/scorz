

## Add Margins, Ruler, and Tab Controls to the Rich Text Editor

### Overview
Add a Google Docs-style horizontal ruler above the editor content area with draggable margin markers and tab stops. This gives users visual control over document layout — left/right margins, first-line indent, and tab positions.

### Approach

**Single file change: `src/components/shared/RichTextEditor.tsx`**

Since TipTap does not have built-in ruler/margin extensions, this will be implemented as a custom UI layer that applies CSS margin/indent styles to the editor content area.

#### 1. Add a `EditorRuler` component (inline in the file)
- Render a horizontal ruler bar (height ~24px) between the toolbar and the editor content
- Show inch/cm tick marks across the width
- Three draggable markers:
  - **Left margin marker** (triangle on the left) — sets `padding-left` on the editor
  - **Right margin marker** (triangle on the right) — sets `padding-right` on the editor
  - **First-line indent marker** (top triangle on left) — sets `text-indent` on paragraphs via a CSS variable
- Tab stop markers: click on the ruler to add a tab stop (small down-arrow), drag to reposition, drag off to remove

#### 2. Margin state management
- Use `useState` for `leftMargin`, `rightMargin`, `firstLineIndent` (in pixels)
- Default: left=72px (1"), right=72px (1"), indent=0
- A margin preset dropdown in the toolbar (Normal, Narrow, Wide, Custom)
- Apply margins as inline `paddingLeft`/`paddingRight` on the editor content wrapper div
- Apply first-line indent via a `<style>` tag targeting `.ProseMirror p:first-of-type` or a CSS variable

#### 3. Toolbar addition
- Add a margin/page-layout dropdown button to the toolbar with preset options:
  - Normal (1" margins)
  - Narrow (0.5" margins)  
  - Wide (1.5" margins)
  - No margins (0)

#### 4. Visual design
- Ruler background: light gray (`bg-muted/50`) with darker tick marks
- Markers styled as small colored triangles (CSS borders or SVG)
- Drag interaction via `onPointerDown` + `onPointerMove` + `onPointerUp`
- Ruler only visible when `editable` is true

### Files Changed

| File | Change |
|---|---|
| `src/components/shared/RichTextEditor.tsx` | Add `EditorRuler` component, margin state, margin preset dropdown, apply margins to editor content wrapper |

