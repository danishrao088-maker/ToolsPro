import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Table as TableIcon,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import { getErrorMessage } from "../services/api";
import { needsHtmlMode } from "./editorUtils";
import "./editor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}

type Mode = "visual" | "html";

interface ToolButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

function ToolButton({ label, onClick, active = false, disabled = false, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-primary text-white" : "text-heading hover:bg-surface-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px bg-line" />;
}

const ICON = 18;

function Toolbar({ editor, onPickImage, onImageAddress }: { editor: Editor | null; onPickImage: () => void; onImageAddress: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? {
            bold: ed.isActive("bold"),
            italic: ed.isActive("italic"),
            underline: ed.isActive("underline"),
            strike: ed.isActive("strike"),
            h2: ed.isActive("heading", { level: 2 }),
            h3: ed.isActive("heading", { level: 3 }),
            bullets: ed.isActive("bulletList"),
            numbers: ed.isActive("orderedList"),
            quote: ed.isActive("blockquote"),
            code: ed.isActive("codeBlock"),
            link: ed.isActive("link"),
            inTable: ed.isActive("table"),
            canUndo: ed.can().undo(),
            canRedo: ed.can().redo(),
          }
        : null,
  });

  if (!editor || !state) return null;

  function setLink() {
    if (!editor) return;
    const current = (editor.getAttributes("link").href as string | undefined) ?? "";
    const answer = window.prompt("Link address (https://... or /page/). Leave empty to remove the link.", current);
    if (answer === null) return;
    const href = answer.trim();
    if (href === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const chain = () => editor.chain().focus();

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface px-2 py-1.5">
      <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 aria-hidden="true" size={ICON} />
      </ToolButton>
      <Divider />
      <ToolButton label="Heading 2" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Heading 3" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        <Heading3 aria-hidden="true" size={ICON} />
      </ToolButton>
      <Divider />
      <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
        <RemoveFormatting aria-hidden="true" size={ICON} />
      </ToolButton>
      <Divider />
      <ToolButton label="Bulleted list" active={state.bullets} onClick={() => chain().toggleBulletList().run()}>
        <List aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Numbered list" active={state.numbers} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Code block" active={state.code} onClick={() => chain().toggleCodeBlock().run()}>
        <Code aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Divider line" onClick={() => chain().setHorizontalRule().run()}>
        <Minus aria-hidden="true" size={ICON} />
      </ToolButton>
      <Divider />
      <ToolButton label="Add or edit link" active={state.link} onClick={setLink}>
        <Link2 aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Remove link" disabled={!state.link} onClick={() => chain().extendMarkRange("link").unsetLink().run()}>
        <Unlink aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Upload a picture" onClick={onPickImage}>
        <ImagePlus aria-hidden="true" size={ICON} />
      </ToolButton>
      <ToolButton label="Picture from an address" onClick={onImageAddress}>
        <ImageIcon aria-hidden="true" size={ICON} />
      </ToolButton>
      <Divider />
      <ToolButton label="Insert table" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <TableIcon aria-hidden="true" size={ICON} />
      </ToolButton>
      {state.inTable ? (
        <>
          <button type="button" className="h-9 rounded-md px-2 text-xs font-medium text-heading hover:bg-surface-muted" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().addRowAfter().run()}>
            + Row
          </button>
          <button type="button" className="h-9 rounded-md px-2 text-xs font-medium text-heading hover:bg-surface-muted" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().addColumnAfter().run()}>
            + Column
          </button>
          <button type="button" className="h-9 rounded-md px-2 text-xs font-medium text-heading hover:bg-surface-muted" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteRow().run()}>
            − Row
          </button>
          <button type="button" className="h-9 rounded-md px-2 text-xs font-medium text-heading hover:bg-surface-muted" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteColumn().run()}>
            − Column
          </button>
          <button type="button" className="h-9 rounded-md px-2 text-xs font-medium text-danger hover:bg-surface-muted" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteTable().run()}>
            Delete table
          </button>
        </>
      ) : null}
    </div>
  );
}

export function RichTextEditor({ value, onChange, onUploadImage }: RichTextEditorProps) {
  // Embeds/video/captions wali purani posts HTML mode mein khulti hain, taake Visual unhein na bigade
  const [mode, setMode] = useState<Mode>(() => (needsHtmlMode(value) ? "html" : "visual"));
  const [imageError, setImageError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // target/rel nahi lagate: purane links jaise the waise rahein (server khud rel lagata hai)
        link: { openOnClick: false, autolink: false, HTMLAttributes: { target: null, rel: null } },
      }),
      Image.configure({ inline: true }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: value,
    editorProps: { attributes: { class: "admin-prose", "aria-label": "Post content", role: "textbox", "aria-multiline": "true" } },
    // Sirf asli tabdeeli par chalta hai: kholne par post ka HTML jyun ka tyun rehta hai
    onUpdate: ({ editor: ed }) => onChange(ed.isEmpty ? "" : ed.getHTML()),
  });

  function switchTo(next: Mode) {
    if (next === mode) return;
    if (next === "visual") {
      if (needsHtmlMode(value) && !window.confirm("This post has embeds, videos or picture captions that Visual mode can remove when you edit. Switch anyway?")) return;
      editor?.commands.setContent(value, { emitUpdate: false });
    }
    setMode(next);
  }

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;
    setImageError("");
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      const alt = window.prompt("Describe the picture (helps accessibility and SEO):", "") ?? "";
      editor.chain().focus().setImage({ src: url, alt: alt.trim() }).run();
    } catch (error) {
      setImageError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  function insertImageFromAddress() {
    if (!editor) return;
    const src = window.prompt("Picture address (https://... or /wp-content/uploads/...):", "");
    if (src === null || src.trim() === "") return;
    const alt = window.prompt("Describe the picture (helps accessibility and SEO):", "") ?? "";
    editor.chain().focus().setImage({ src: src.trim(), alt: alt.trim() }).run();
  }

  const tabClass = (active: boolean) =>
    `h-9 rounded-md px-3 text-sm font-medium transition-colors ${active ? "bg-primary text-white" : "text-heading hover:bg-surface-muted"}`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-heading">Content</span>
        <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
          <button type="button" aria-pressed={mode === "visual"} className={tabClass(mode === "visual")} onClick={() => switchTo("visual")}>
            Visual
          </button>
          <button type="button" aria-pressed={mode === "html"} className={tabClass(mode === "html")} onClick={() => switchTo("html")}>
            HTML
          </button>
        </div>
      </div>

      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void onFileChosen(e)} />

      {mode === "visual" ? (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <Toolbar editor={editor} onPickImage={() => fileInput.current?.click()} onImageAddress={insertImageFromAddress} />
          <EditorContent editor={editor} />
        </div>
      ) : (
        <textarea
          aria-label="Post HTML"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={22}
          spellCheck={false}
          className="w-full rounded-lg border border-line bg-surface p-3 font-mono text-sm leading-relaxed text-heading"
        />
      )}

      {uploading ? <p role="status" className="mt-2 text-sm">Uploading picture...</p> : null}
      {imageError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {imageError}
        </p>
      ) : null}
      <p className="mt-2 text-sm">
        {mode === "visual"
          ? "Visual mode keeps headings, lists, links, pictures and tables. For anything custom (videos, special layouts) use the HTML tab."
          : "You are editing the raw HTML. Scripts and unsafe code are removed automatically when you save."}
      </p>
    </div>
  );
}
