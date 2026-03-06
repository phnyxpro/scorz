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

  // Images → render as styled figures
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, src: string) => {
    const caption = alt ? `<figcaption class="px-4 py-2.5 text-xs text-center border-t border-border bg-muted/30 text-muted-foreground">${alt}</figcaption>` : "";
    return `<figure class="my-6 rounded-xl overflow-hidden border border-border shadow-sm bg-card"><img src="${src}" alt="${alt}" class="w-full h-auto block" loading="lazy" />${caption}</figure>`;
  });

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
    return "";
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
