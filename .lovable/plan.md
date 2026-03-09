

## Plan: Add Rich Text Editor & Email Preview to Broadcast Component

### What We're Building
Transform the Email Broadcast component from a simple textarea to a professional email composer with:
- **Rich text editor** (same TipTap editor used in Rules/Rubric pages) for message composition
- **2-column layout**: Editor on left, live preview on right
- **Branded preview**: Shows how the email will look with SCORZ template styling

### Current State Analysis
**EmailBroadcast component** (`src/components/chat/EmailBroadcast.tsx`):
- Uses basic `<Textarea>` for message input (line 236-243)
- Single-column layout
- No preview capability
- Content stored as plain text

**RichTextEditor** (`src/components/shared/RichTextEditor.tsx`):
- Full TipTap editor with formatting toolbar
- Props: `content` (HTML string), `onChange` (callback), `placeholder`, `editable`
- Outputs HTML via `editor.getHTML()`

**Email Template** (`supabase/functions/send-broadcast-email/index.ts`):
- Injects content directly as HTML (line 160)
- Uses `buildEmail()` helper with SCORZ branding (#1a1b25 charcoal, #f59e0b orange)

### Implementation Plan

**1. Update EmailBroadcast Component**

Replace `<Textarea>` with `<RichTextEditor>`:
- Import RichTextEditor from `@/components/shared/RichTextEditor`
- Change `content` state to store HTML instead of plain text
- Wire up RichTextEditor with `content` and `onChange` props

**2. Create 2-Column Layout**

Split the message section into two columns:
- **Left column**: Subject + Rich Text Editor
- **Right column**: Live email preview
- Use CSS Grid: `grid-cols-1 lg:grid-cols-2` (stacked on mobile, side-by-side on desktop)
- Add gap between columns

**3. Build Preview Component**

Create inline preview showing:
- SCORZ header with logo styling
- Subject line as `<h2>`
- Competition name as metadata
- Rich text content wrapped in styled container
- Email footer with branding

Preview styling must match `email-html.ts`:
- White background (#ffffff)
- Charcoal text (#1a1b25)
- Orange accents (#f59e0b)
- Max width 560px
- Proper padding and spacing

**4. Styling Considerations**

- RichTextEditor height: ~300px min-height for comfortable editing
- Preview container: scrollable if content overflows
- Mobile: preview appears below editor
- Maintain existing spacing for recipient groups and action buttons

### Technical Details

**State Change**:
```typescript
// Before: const [content, setContent] = useState("");
// After: const [content, setContent] = useState(""); // Now stores HTML
```

**Grid Layout Structure**:
```
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <div> {/* Editor column */}
    <Label>Subject</Label>
    <Input />
    <Label>Message</Label>
    <RichTextEditor content={content} onChange={setContent} />
  </div>
  <div> {/* Preview column */}
    <Label>Preview</Label>
    <div className="border rounded-md bg-[#f4f4f5] p-4 overflow-auto">
      {/* Branded email preview */}
    </div>
  </div>
</div>
```

**Preview Template Inline Styling**:
- Replicate key styles from `email-html.ts`
- SCORZ header: charcoal bg, white+orange text
- Body: white bg, proper padding
- Content wrapper: light gray bg (#f9fafb), rounded corners

### No Breaking Changes
- All existing functionality preserved (recipient selection, extra emails, send logic)
- Backend expects HTML content (already does)
- No database schema changes needed

