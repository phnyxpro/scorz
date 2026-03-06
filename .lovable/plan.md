

## High-Fidelity Document-to-HTML Conversion

### Problem
The current `parse-pdf` edge function passes a URL string to the AI model, but the model cannot access external URLs. It returns plain text, not styled HTML. Documents need to be faithfully converted to HTML that preserves the original formatting.

### Solution

**1. Rewrite `supabase/functions/parse-pdf/index.ts`**

- Download the file bytes from the storage URL
- Detect file type from extension
- **TXT files**: Read as text, wrap lines in `<p>` tags (no AI needed)
- **DOCX files**: Use `mammoth` npm package (`npm:mammoth`) to convert directly to HTML with styles preserved (headings, bold, italic, lists, tables, images). This is deterministic and high-fidelity.
- **PDF files**: Send the actual file bytes to Gemini as base64-encoded content in the multimodal message format (`{ type: "image_url", image_url: { url: "data:application/pdf;base64,..." } }`). Instruct Gemini to reproduce the document as faithful HTML with inline styles for colors, fonts, alignment, tables, and layout.
- For rubric type: still extract criteria via AI tool calls as before, but also return styled `html_content`
- For rules type: return the HTML as `content`

**2. Update `DocumentUpload.tsx`**

- Expand accepted file types: `.pdf,.doc,.docx,.txt`
- Update MIME type validation to include `text/plain`
- Update label default from "Document" to support broader types

**3. Update `CompetitionDetail.tsx`**

- Auto-trigger document scanning immediately after upload completes (no separate "Scan Document" button click needed)
- Update `onUploaded` callbacks to call `scanDocument()` right after setting the URL
- Update description text to mention supported file types (PDF, DOCX, TXT)
- Keep the manual "Scan Document" button as a re-scan option

**4. Update edge function prompts for PDF**

New system prompt for rules PDF extraction:
```
You are a document-to-HTML converter. Convert this PDF into clean, semantic HTML 
that faithfully reproduces the original document's appearance. Preserve:
- Headings (h1-h6), bold, italic, underline
- Colors and highlights using inline styles
- Tables with borders and cell styling
- Numbered and bulleted lists
- Text alignment (center, right, justify)
- Font sizes using relative em units
Return ONLY the HTML body content, no <html>/<head> wrapper.
```

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/parse-pdf/index.ts` | Rewrite: download file, use mammoth for DOCX, Gemini multimodal for PDF, plain wrap for TXT |
| `src/components/shared/DocumentUpload.tsx` | Accept `.pdf,.doc,.docx,.txt`, update validation |
| `src/pages/CompetitionDetail.tsx` | Auto-scan on upload, update labels/descriptions |

### Technical Notes

- mammoth.js produces clean semantic HTML from DOCX and handles styles, tables, lists, and images well
- Gemini supports PDF binary input via base64 data URIs in the multimodal content array
- TXT conversion is trivial and doesn't need AI
- The resulting HTML loads directly into the TipTap rich text editor and renders on public pages via `dangerouslySetInnerHTML` with prose styling

