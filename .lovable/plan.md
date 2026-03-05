

## Plan: Full Google Docs-like Rich Text Editor

Upgrade the TipTap editor with comprehensive formatting capabilities including tables, text styling, alignment, and more.

### New Dependencies to Install

- `@tiptap/extension-table` (includes TableKit: Table, TableRow, TableHeader, TableCell)
- `@tiptap/extension-underline`
- `@tiptap/extension-text-align`
- `@tiptap/extension-highlight`
- `@tiptap/extension-subscript`
- `@tiptap/extension-superscript`
- `@tiptap/extension-color`
- `@tiptap/extension-text-style`
- `@tiptap/extension-placeholder`

### File Changes

**`src/components/shared/RichTextEditor.tsx`** — Full rewrite of the editor component:

1. **Extensions**: Add all new extensions to the editor config (TableKit, Underline, TextAlign, Highlight, Color, TextStyle, Subscript, Superscript, Placeholder)

2. **Toolbar** — Organized into grouped sections with dividers:
   - **Text formatting**: Bold, Italic, Underline, Strikethrough, Subscript, Superscript
   - **Headings**: H1, H2, H3
   - **Text color / Highlight**: Color picker popover, highlight toggle
   - **Alignment**: Left, Center, Right, Justify
   - **Lists**: Bullet, Ordered
   - **Table controls**: Insert table, Add/delete row, Add/delete column, Merge/split cells
   - **Misc**: Horizontal rule, Blockquote, Undo, Redo

3. **Table CSS**: Add scoped styles for table borders, cell padding, header styling, and selected-cell highlight so tables render properly in both the editor and public views

**`src/index.css`** — Add table styling rules for the `.prose` class so saved HTML tables render with borders on public-facing pages (RulesPage, RubricPage)

### Toolbar Layout

```text
[B][I][U][S̶][x₂][x²] | [H1][H2][H3] | [Color][Highlight] | [⫷][⫸][⫿][⫾] | [•][1.] | [⊞ Table ▾] | [—][❝] | [↩][↪]
```

The table dropdown will contain: Insert 3x3 table, Add row before/after, Delete row, Add column before/after, Delete column, Merge cells, Split cell, Delete table.

### No database changes required

Existing `rules_content` and `rubric_content` columns already store HTML — the richer HTML from these new formatting options will render correctly via the existing `dangerouslySetInnerHTML` + `prose` class on public pages.

