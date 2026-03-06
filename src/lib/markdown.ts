/**
 * Lightweight markdown-to-HTML converter for the Knowledge Base.
 * Supports: headings, bold, italic, links, images (with figure wrappers),
 * unordered/ordered lists, blockquotes, inline code, tables, horizontal rules.
 */

/** Convert a markdown string to safe HTML */
export function markdownToHtml(md: string): string {
  let html = md;

  // Normalize line endings
  html = html.replace(/\r\n/g, "\n");

  // Tables (must run before other block-level transforms)
  html = html.replace(
    /(?:^|\n)((?:\|.+\|\n)+)/g,
    (_match, tableBlock: string) => {
      const rows = tableBlock.trim().split("\n");
      if (rows.length < 2) return tableBlock;

      const headerCells = rows[0].split("|").filter((c) => c.trim());
      // Skip separator row (row[1])
      const bodyRows = rows.slice(2);

      let table = '<div class="overflow-x-auto my-4"><table class="w-full text-sm border-collapse"><thead><tr>';
      headerCells.forEach((cell) => {
        table += `<th class="border border-border px-3 py-2 text-left font-semibold bg-muted/50">${cell.trim()}</th>`;
      });
      table += "</tr></thead><tbody>";
      bodyRows.forEach((row) => {
        const cells = row.split("|").filter((c) => c.trim());
        table += "<tr>";
        cells.forEach((cell) => {
          table += `<td class="border border-border px-3 py-2">${cell.trim()}</td>`;
        });
        table += "</tr>";
      });
      table += "</tbody></table></div>";
      return "\n" + table + "\n";
    }
  );

  // Blockquotes
  html = html.replace(
    /(?:^|\n)(?:>\s?(.+?)(?:\n|$))+/g,
    (_match) => {
      const content = _match
        .split("\n")
        .map((l) => l.replace(/^>\s?/, ""))
        .join(" ")
        .trim();
      return `\n<blockquote class="border-l-4 border-accent pl-4 py-2 my-4 bg-accent/5 rounded-r text-sm text-muted-foreground italic">${content}</blockquote>\n`;
    }
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-foreground">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-foreground">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-foreground">$1</h1>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-6 border-border" />');

  // Images → figure with placeholder fallback
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, alt: string, src: string) => {
      return `<figure class="my-6">
        <div class="rounded-lg border border-border overflow-hidden bg-muted/30">
          <div class="aspect-video flex items-center justify-center bg-muted/20">
            <div class="text-center p-8">
              <svg class="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
              <p class="text-xs text-muted-foreground">Screenshot coming soon</p>
            </div>
          </div>
        </div>
        ${alt ? `<figcaption class="text-xs text-muted-foreground mt-2 text-center">${alt}</figcaption>` : ""}
      </figure>`;
    }
  );

  // Bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-secondary underline hover:text-secondary/80" target="_blank" rel="noopener">$1</a>');

  // Unordered lists
  html = html.replace(
    /(?:^|\n)((?:- .+\n?)+)/g,
    (_match, listBlock: string) => {
      const items = listBlock
        .trim()
        .split("\n")
        .map((l) => `<li class="ml-4">${l.replace(/^- /, "")}</li>`)
        .join("\n");
      return `\n<ul class="list-disc pl-4 my-3 space-y-1 text-sm">\n${items}\n</ul>\n`;
    }
  );

  // Ordered lists
  html = html.replace(
    /(?:^|\n)((?:\d+\. .+\n?)+)/g,
    (_match, listBlock: string) => {
      const items = listBlock
        .trim()
        .split("\n")
        .map((l) => `<li class="ml-4">${l.replace(/^\d+\. /, "")}</li>`)
        .join("\n");
      return `\n<ol class="list-decimal pl-4 my-3 space-y-1 text-sm">\n${items}\n</ol>\n`;
    }
  );

  // Paragraphs: wrap remaining standalone lines
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Don't wrap if it's already an HTML element
      if (/^<[a-z]/.test(trimmed)) return trimmed;
      return `<p class="text-sm leading-relaxed text-foreground/80 my-2">${trimmed}</p>`;
    })
    .join("\n");

  return html;
}

/** Render a video embed or placeholder */
export function renderVideoEmbed(url: string): string {
  if (!url) {
    return `<div class="rounded-lg border border-dashed border-border bg-muted/20 aspect-video flex items-center justify-center my-6">
      <div class="text-center p-8">
        <svg class="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></svg>
        <p class="text-xs text-muted-foreground">Video walkthrough coming soon</p>
      </div>
    </div>`;
  }

  // Convert YouTube/Loom URLs to embeddable format
  let embedUrl = url;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
  const loomMatch = url.match(/loom\.com\/share\/([^?]+)/);
  if (loomMatch) embedUrl = `https://www.loom.com/embed/${loomMatch[1]}`;

  return `<div class="rounded-lg overflow-hidden border border-border my-6">
    <div class="aspect-video">
      <iframe src="${embedUrl}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
  </div>`;
}
