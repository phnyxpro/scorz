

## Allow Rich Paste with Style & Formatting in the Editor

### Problem
When pasting content from external sources (Word, Google Docs, web pages), formatting like font colors, highlights, bold, headings, and table structures may be stripped because ProseMirror only preserves marks/nodes defined in the schema. Common inline styles from external sources (e.g., `<span style="color:...">`, `<b>`, background colors) need explicit handling.

### Solution

**Single file change: `src/components/shared/RichTextEditor.tsx`**

Add `transformPastedHTML` to the `editorProps` config to sanitize but preserve rich formatting from pasted content:

1. **Map inline styles to TipTap-compatible markup** — Convert `style="color:..."` on spans to `data-color` attributes that the Color extension recognizes, convert `style="background-color:..."` to highlight marks, and preserve font-weight/font-style as their semantic equivalents (`<strong>`, `<em>`).

2. **Preserve structural elements** — Tables, lists, headings, blockquotes, and images from pasted HTML are already supported by the loaded extensions; just ensure the HTML isn't over-sanitized before ProseMirror parses it.

3. **Add `transformPastedText`** — For plain-text pastes, wrap lines in `<p>` tags to maintain paragraph structure instead of collapsing everything into one block.

The transform function will use a DOMParser to parse the pasted HTML, walk through elements to convert inline styles to semantic markup that TipTap's extensions understand, then serialize back to HTML string for ProseMirror's schema-based parsing.

