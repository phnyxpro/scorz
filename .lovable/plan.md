

# Plan: Rules Editor Enhancements

## 1. Auto-save for Rules Editor
- In `CompetitionDetail.tsx`, add a debounced auto-save (e.g. 2-second delay) that fires whenever `rulesContent` or `rubricContent` changes
- Use a `useRef` timer pattern: on each change, clear the previous timeout and set a new one that writes to the database
- Show a subtle "Saving..." / "Saved" indicator near the editor label
- Remove the need to click the main Save button for rules/rubric content changes

## 2. Paragraph Style Button (after H3 in toolbar)
- In `RichTextEditor.tsx`, add a "Paragraph" toolbar button after the H3 button (both in the main toolbar and bubble menu)
- Clicking it calls `editor.chain().focus().setParagraph().run()` to reset the block back to a normal paragraph
- Use the `Pilcrow` icon from lucide-react
- Show it as active when the current node is a paragraph (not a heading)

## 3. Alphabet List (after Numbered List)
- Add an alphabetical ordered list button after the numbered list button in the toolbar
- TipTap's `orderedList` supports a `type` attribute via HTML `<ol type="a">`
- Create a small helper that toggles an ordered list with `type="a"` by using `editor.chain().focus().toggleOrderedList().run()` then updating the list node's attributes to set `HTMLAttributes: { type: 'a' }`
- Alternatively, use a custom CSS class approach: insert a regular ordered list and add a CSS `list-style-type: lower-alpha` style
- Use the `ListOrdered` icon with an "A" label or the `ALargeSmall` icon from lucide-react

### Files Changed
- `src/pages/CompetitionDetail.tsx` — add debounced auto-save for rulesContent/rubricContent
- `src/components/shared/RichTextEditor.tsx` — add Paragraph button + Alphabet list button to toolbar and bubble menu
- `src/index.css` — add `.list-alpha` style for `list-style-type: lower-alpha` if needed

