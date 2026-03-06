import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table";
import { TableHeader } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Color } from "@tiptap/extension-text-style";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useEffect, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Palette,
  TableIcon,
  Plus,
  Trash2,
  ImagePlus,
  Quote,
  Columns,
  Rows,
  Merge,
  Split,
  Ruler,
} from "lucide-react";
import { EditorRuler } from "./EditorRuler";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Black", value: "#000000" },
  { name: "Dark Gray", value: "#4b5563" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Green", value: "#16a34a" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#9333ea" },
  { name: "Pink", value: "#db2777" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", value: "" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Purple", value: "#e9d5ff" },
];

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  className,
  editable = true,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [leftMargin, setLeftMargin] = useState(72);
  const [rightMargin, setRightMargin] = useState(72);
  const [firstLineIndent, setFirstLineIndent] = useState(0);
  const [tabStops, setTabStops] = useState<{ id: string; position: number }[]>([]);
  const [showRuler, setShowRuler] = useState(true);

  const MARGIN_PRESETS = [
    { label: "Normal (1\")", left: 96, right: 96 },
    { label: "Narrow (0.5\")", left: 48, right: 48 },
    { label: "Wide (1.5\")", left: 144, right: 144 },
    { label: "None", left: 0, right: 0 },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Color,
      TextStyle,
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-foreground",
      },
      transformPastedHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const walk = (el: Element) => {
          const style = (el as HTMLElement).style;
          if (style) {
            // Map color inline style to TipTap Color extension attribute
            if (style.color) {
              el.setAttribute("style", `color: ${style.color}`);
            }
            // Map background-color to <mark> highlight
            const bg = style.backgroundColor;
            if (bg) {
              const mark = doc.createElement("mark");
              mark.setAttribute("data-color", bg);
              mark.style.backgroundColor = bg;
              while (el.firstChild) mark.appendChild(el.firstChild);
              el.appendChild(mark);
            }
            // Map font-weight bold to <strong>
            const fw = style.fontWeight;
            if (fw === "bold" || fw === "700" || fw === "800" || fw === "900") {
              const strong = doc.createElement("strong");
              while (el.firstChild) strong.appendChild(el.firstChild);
              el.appendChild(strong);
            }
            // Map font-style italic to <em>
            if (style.fontStyle === "italic") {
              const em = doc.createElement("em");
              while (el.firstChild) em.appendChild(el.firstChild);
              el.appendChild(em);
            }
            // Map text-decoration underline to <u>
            if (style.textDecoration?.includes("underline")) {
              const u = doc.createElement("u");
              while (el.firstChild) u.appendChild(el.firstChild);
              el.appendChild(u);
            }
          }
          Array.from(el.children).forEach(walk);
        };

        walk(doc.body);
        return doc.body.innerHTML;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  const handleImageUpload = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      const ext = file.name.split(".").pop();
      const path = `editor-images/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("competition-assets")
        .upload(path, file, { upsert: true });

      if (error) {
        // Fallback to base64 if storage fails
        const reader = new FileReader();
        reader.onload = () => {
          editor
            .chain()
            .focus()
            .setImage({ src: reader.result as string })
            .run();
        };
        reader.readAsDataURL(file);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("competition-assets").getPublicUrl(path);

      editor.chain().focus().setImage({ src: publicUrl }).run();

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [editor]
  );

  const insertImageFromUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
    disabled,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
    disabled?: boolean;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7",
        active && "bg-accent text-accent-foreground"
      )}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );

  const Divider = () => <div className="w-px h-5 bg-border mx-1" />;

  return (
    <div
      className={cn(
        "border border-border rounded-md bg-background overflow-hidden",
        className
      )}
    >
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
      />

      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
          {/* Text formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            active={editor.isActive("subscript")}
            title="Subscript"
          >
            <SubscriptIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            active={editor.isActive("superscript")}
            title="Superscript"
          >
            <SuperscriptIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Divider />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Divider />

          {/* Text color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Text Color"
              >
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded border border-border hover:scale-110 transition-transform",
                      !c.value && "bg-background"
                    )}
                    style={c.value ? { backgroundColor: c.value } : undefined}
                    title={c.name}
                    onClick={() => {
                      if (c.value) {
                        editor.chain().focus().setColor(c.value).run();
                      } else {
                        editor.chain().focus().unsetColor().run();
                      }
                    }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Highlight */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  editor.isActive("highlight") && "bg-accent text-accent-foreground"
                )}
                title="Highlight"
              >
                <Highlighter className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-4 gap-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded border border-border hover:scale-110 transition-transform",
                      !c.value && "bg-background"
                    )}
                    style={c.value ? { backgroundColor: c.value } : undefined}
                    title={c.name}
                    onClick={() => {
                      if (c.value) {
                        editor
                          .chain()
                          .focus()
                          .toggleHighlight({ color: c.value })
                          .run();
                      } else {
                        editor.chain().focus().unsetHighlight().run();
                      }
                    }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Divider />

          {/* Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Align Left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Align Right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            active={editor.isActive({ textAlign: "justify" })}
            title="Justify"
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Divider />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Divider />

          {/* Table dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7",
                  editor.isActive("table") && "bg-accent text-accent-foreground"
                )}
                title="Table"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run()
                }
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Insert 3×3 Table
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addRowBefore().run()}
                disabled={!editor.isActive("table")}
              >
                <Rows className="h-3.5 w-3.5 mr-2" />
                Add Row Before
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addRowAfter().run()}
                disabled={!editor.isActive("table")}
              >
                <Rows className="h-3.5 w-3.5 mr-2" />
                Add Row After
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().deleteRow().run()}
                disabled={!editor.isActive("table")}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete Row
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                disabled={!editor.isActive("table")}
              >
                <Columns className="h-3.5 w-3.5 mr-2" />
                Add Column Before
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                disabled={!editor.isActive("table")}
              >
                <Columns className="h-3.5 w-3.5 mr-2" />
                Add Column After
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().deleteColumn().run()}
                disabled={!editor.isActive("table")}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete Column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().mergeCells().run()}
                disabled={!editor.isActive("table")}
              >
                <Merge className="h-3.5 w-3.5 mr-2" />
                Merge Cells
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().splitCell().run()}
                disabled={!editor.isActive("table")}
              >
                <Split className="h-3.5 w-3.5 mr-2" />
                Split Cell
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().deleteTable().run()}
                disabled={!editor.isActive("table")}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete Table
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Image */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Insert Image"
              >
                <ImagePlus className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={handleImageUpload}>
                <Plus className="h-3.5 w-3.5 mr-2" />
                Upload Image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={insertImageFromUrl}>
                <ImagePlus className="h-3.5 w-3.5 mr-2" />
                From URL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Divider />

          {/* Misc */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Blockquote"
          >
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Divider />

          {/* Undo / Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Divider />

          {/* Ruler toggle */}
          <ToolbarButton
            onClick={() => setShowRuler(!showRuler)}
            active={showRuler}
            title="Toggle Ruler"
          >
            <Ruler className="h-3.5 w-3.5" />
          </ToolbarButton>

          {/* Margin presets */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                title="Page Margins"
              >
                Margins
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {MARGIN_PRESETS.map((p) => (
                <DropdownMenuItem
                  key={p.label}
                  onClick={() => {
                    setLeftMargin(p.left);
                    setRightMargin(p.right);
                  }}
                >
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Ruler */}
      {editable && showRuler && (
        <EditorRuler
          leftMargin={leftMargin}
          rightMargin={rightMargin}
          firstLineIndent={firstLineIndent}
          onLeftMarginChange={setLeftMargin}
          onRightMarginChange={setRightMargin}
          onFirstLineIndentChange={setFirstLineIndent}
          tabStops={tabStops}
          onTabStopsChange={setTabStops}
        />
      )}

      {/* Floating Bubble Menu on text selection */}
      {editor && editable && (
        <BubbleMenu
          editor={editor}
          options={{ placement: "top" }}
          className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg border border-border bg-popover shadow-lg"
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
            active={editor.isActive("highlight")}
            title="Highlight"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </ToolbarButton>
        </BubbleMenu>
      )}

      {/* Editor content with margins applied */}
      <style>{`
        .editor-margins .ProseMirror {
          padding-left: ${leftMargin}px !important;
          padding-right: ${rightMargin}px !important;
        }
        .editor-margins .ProseMirror p {
          text-indent: ${firstLineIndent}px;
        }
      `}</style>
      <div className="editor-margins">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
