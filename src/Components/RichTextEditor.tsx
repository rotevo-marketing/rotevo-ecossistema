"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import { useEffect, useCallback } from "react";
import {RotevoTablerIcon} from "@/Components/RotevoTablerIcon";

function ToolbarBtn({
  onClick,
  isActive,
  title,
  children,
  disabled=false,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      onClick={onClick}
      aria-label={title}
      aria-pressed={isActive??false}
      disabled={disabled}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold transition-colors ${
        isActive
          ? "bg-slate-200 text-slate-900"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-slate-200" />;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Escreva aqui...",
  minHeight = 180,
  readOnly = false,
  label="Editor de texto",
  tablerToolbar=false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
  label?: string;
  tablerToolbar?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender:false,
    shouldRerenderOnTransaction:true,
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: value || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (readOnly) return;
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        "aria-label":label,
        role:"textbox",
        "aria-multiline":"true",
        class: "prose prose-slate max-w-none outline-none focus:outline-none px-4 py-4 text-slate-800 prose-p:leading-7 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:font-semibold prose-a:text-slate-900",
        style: `min-height:${minHeight}px`,
      },
    },
  });

  // Sync external value changes (e.g. on load)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== (current === "<p></p>" ? "" : current)) {
      editor.commands.setContent(value || "",{emitUpdate:false});
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync readOnly changes after creation
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL do link:");
    if (!url) return;
    try{const parsed=new URL(url);if(!["https:","http:","mailto:","tel:"].includes(parsed.protocol))return;}catch{return;}
    if (editor.state.selection.empty) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const removeLink = useCallback(() => {
    editor?.chain().focus().unsetLink().run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-black/10">
      {/* Existing toolbar, with official Tabler artwork for the structured 02.01 form. */}
      {!readOnly && <div role="group" aria-label={"Formatação de "+label} className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Negrito"
        >
          {tablerToolbar?<RotevoTablerIcon name="bold" size={17}/>:<strong>B</strong>}
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Itálico"
        >
          {tablerToolbar?<RotevoTablerIcon name="italic" size={17}/>:<em>I</em>}
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Sublinhado"
        >
          {tablerToolbar?<RotevoTablerIcon name="underline" size={17}/>:<span className="underline">U</span>}
        </ToolbarBtn>
        {!tablerToolbar&&<ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Riscado"
        >
          <span className="line-through">S</span>
        </ToolbarBtn>}

        <Divider />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Lista com bullets"
        >
          {tablerToolbar?<RotevoTablerIcon name="list" size={17}/>:(<svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <circle cx="2" cy="4" r="1.5" />
            <rect x="5" y="3" width="9" height="2" rx="1" />
            <circle cx="2" cy="8" r="1.5" />
            <rect x="5" y="7" width="9" height="2" rx="1" />
            <circle cx="2" cy="12" r="1.5" />
            <rect x="5" y="11" width="9" height="2" rx="1" />
          </svg>)}
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Lista numerada"
        >
          {tablerToolbar?<RotevoTablerIcon name="list-numbers" size={17}/>:(<svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <text x="0" y="5" fontSize="5" fontWeight="bold">1.</text>
            <rect x="5" y="3" width="9" height="2" rx="1" />
            <text x="0" y="9" fontSize="5" fontWeight="bold">2.</text>
            <rect x="5" y="7" width="9" height="2" rx="1" />
            <text x="0" y="13" fontSize="5" fontWeight="bold">3.</text>
            <rect x="5" y="11" width="9" height="2" rx="1" />
          </svg>)}
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn
          onClick={editor.isActive("link") ? removeLink : addLink}
          isActive={editor.isActive("link")}
          title={editor.isActive("link") ? "Remover link" : "Inserir link"}
        >
          {tablerToolbar?<RotevoTablerIcon name="link" size={17}/>:(<svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6.5 9.5a4.243 4.243 0 006 0l1.5-1.5a4.243 4.243 0 00-6-6L7.5 3.5" strokeLinecap="round" />
            <path d="M9.5 6.5a4.243 4.243 0 00-6 0L2 8a4.243 4.243 0 006 6L9.5 12.5" strokeLinecap="round" />
          </svg>)}
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          isActive={false}
          title="Limpar formatação"
        >
          {tablerToolbar?<RotevoTablerIcon name="restore" size={17}/>:(<svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 13l10-10M8 3l5 5M3 8l5 5" strokeLinecap="round" />
          </svg>)}
        </ToolbarBtn>
      </div>}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
