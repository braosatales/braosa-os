"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { DriveFile } from "@/lib/drive"
import { Icon } from "@/components/ui"
import { useLang } from "@/lib/i18n"
import { relativeTime } from "@/lib/date"
import { useKeyboardHeight } from "@/lib/hooks/useKeyboardHeight"
import { useIsMobile } from "@/lib/hooks/useIsMobile"

type Props = {
  file: DriveFile
  onClose: () => void
  onSaved: (file: DriveFile) => void
}

function parseMarkdown(md: string): string {
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  // Code blocks
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre style="font-family:var(--font-mono);background:var(--bg-raised-2);border-radius:var(--radius-sm);padding:12px 16px;font-size:13px;overflow-x:auto;margin:12px 0">${code}</pre>`
  )

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, (_, text) =>
    `<blockquote style="border-left:3px solid var(--c-task);padding-left:12px;margin:8px 0;color:var(--ink-dim)">${text}</blockquote>`
  )

  // HR
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--edge);margin:20px 0">')

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-family:var(--font-display);font-size:16px;font-weight:600;color:var(--ink);margin:20px 0 8px">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-family:var(--font-display);font-size:19px;font-weight:600;color:var(--ink);margin:24px 0 10px">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--ink);margin:28px 0 12px">$1</h1>')

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);background:var(--bg-raised-2);padding:2px 6px;border-radius:4px;font-size:0.9em">$1</code>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--c-task);text-decoration:underline">$1</a>')

  // Unordered lists
  html = html.replace(/^(- .+(\n- .+)*)/gm, (block) => {
    const items = block.split('\n').filter(l => l.startsWith('- '))
      .map(l => `<li style="margin:4px 0">${l.slice(2)}</li>`).join('')
    return `<ul style="padding-left:20px;margin:8px 0">${items}</ul>`
  })

  // Ordered lists
  html = html.replace(/^(\d+\. .+(\n\d+\. .+)*)/gm, (block) => {
    const items = block.split('\n').filter(l => /^\d+\. /.test(l))
      .map(l => `<li style="margin:4px 0">${l.replace(/^\d+\. /, '')}</li>`).join('')
    return `<ol style="padding-left:20px;margin:8px 0">${items}</ol>`
  })

  // Paragraphs
  html = html.replace(/\n\n+/g, '</p><p style="margin:10px 0">')
  html = `<p style="margin:10px 0">${html}</p>`

  return html
}

function insertWrapped(textarea: HTMLTextAreaElement, prefix: string, suffix: string) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.slice(start, end) || 'text'
  const replacement = `${prefix}${selected}${suffix}`
  const newValue = textarea.value.slice(0, start) + replacement + textarea.value.slice(end)
  return { value: newValue, cursor: start + prefix.length + selected.length + suffix.length }
}

export default function FileEditor({ file, onClose, onSaved }: Props) {
  const lang = useLang()
  const isMobile = useIsMobile()
  const keyboardHeight = useKeyboardHeight()
  const [content, setContent] = useState("")
  const [savedContent, setSavedContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<"edit" | "preview">("edit")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isDirty = content !== savedContent

  useEffect(() => {
    setLoading(true)
    fetch(`/api/drive/files/${file.id}`)
      .then(r => r.json())
      .then(d => {
        setContent(d.content ?? "")
        setSavedContent(d.content ?? "")
      })
      .finally(() => setLoading(false))
  }, [file.id])

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/drive/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      setSavedContent(content)
      setSavedAt(new Date())
      if (data.file) onSaved(data.file)
    } finally {
      setSaving(false)
    }
  }, [content, isDirty, saving, file.id, onSaved])

  // Ctrl+S / Cmd+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleSave])

  function handleClose() {
    if (isDirty) {
      const msg = lang === "pt"
        ? "Tens alterações não guardadas. Sair?"
        : "You have unsaved changes. Leave?"
      if (!confirm(msg)) return
    }
    onClose()
  }

  function handleTab(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return
    e.preventDefault()
    const ta = textareaRef.current!
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newValue = ta.value.slice(0, start) + "  " + ta.value.slice(end)
    setContent(newValue)
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + 2
    })
  }

  function applyFormat(prefix: string, suffix: string) {
    const ta = textareaRef.current
    if (!ta) return
    const { value, cursor } = insertWrapped(ta, prefix, suffix)
    setContent(value)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = cursor
    })
  }

  const toolbarButtons = [
    { label: "B", title: "Bold", action: () => applyFormat("**", "**") },
    { label: "I", title: "Italic", action: () => applyFormat("*", "*") },
    { label: "#", title: "Heading", action: () => applyFormat("# ", "") },
    { label: "`", title: "Code", action: () => applyFormat("`", "`") },
    { label: "[]", title: "Link", action: () => applyFormat("[", "](url)") },
    { label: "—", title: "List", action: () => applyFormat("- ", "") },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-base)", paddingBottom: keyboardHeight }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        borderBottom: "1px solid var(--edge)", flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600,
              color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {file.name}
            </span>
            {isDirty && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--c-health)", flexShrink: 0 }} title="Unsaved changes" />
            )}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>
            {saving
              ? (lang === "pt" ? "A guardar..." : "Saving...")
              : savedAt
              ? (lang === "pt" ? `Guardado ${relativeTime(savedAt)}` : `Saved ${relativeTime(savedAt)}`)
              : relativeTime(file.modifiedTime)
            }
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener"
            style={{ fontSize: 11, color: "var(--ink-faint)", textDecoration: "none", padding: "4px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--edge)" }}
          >
            {lang === "pt" ? "Abrir no Drive" : "Open in Drive"}
          </a>
          <button
            className="btn-accent btn"
            style={{ "--accent": "var(--c-task)", fontSize: 12, padding: "6px 12px" } as React.CSSProperties}
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {lang === "pt" ? "Guardar" : "Save"}
          </button>
          <button className="btn" style={{ padding: "6px 10px" }} onClick={handleClose}>
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4, padding: "8px 12px",
        borderBottom: "1px solid var(--edge-soft)", flexShrink: 0,
        overflowX: isMobile ? "auto" : "visible", flexWrap: "nowrap",
      }}>
        {(["edit", "preview"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600,
              border: `1px solid ${mode === m ? "var(--c-task)" : "transparent"}`,
              background: mode === m ? "color-mix(in oklch, var(--c-task) 14%, var(--bg-raised))" : "transparent",
              color: mode === m ? "var(--c-task)" : "var(--ink-faint)",
              cursor: "pointer",
            }}
          >
            {m === "edit" ? (lang === "pt" ? "Editar" : "Edit") : (lang === "pt" ? "Pré-visualizar" : "Preview")}
          </button>
        ))}

        {mode === "edit" && (
          <>
            <div style={{ width: 1, height: 16, background: "var(--edge)", margin: "0 4px" }} />
            {toolbarButtons.map(btn => (
              <button
                key={btn.label}
                title={btn.title}
                onClick={btn.action}
                style={{
                  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "var(--radius-sm)", border: "1px solid transparent",
                  background: "transparent", color: "var(--ink-dim)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-raised-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {btn.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-faint)" }}>
            {lang === "pt" ? "A carregar..." : "Loading..."}
          </div>
        ) : mode === "edit" ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleTab}
            style={{
              width: "100%", height: "100%", padding: "20px 24px",
              fontFamily: "var(--font-mono)", fontSize: 14, lineHeight: 1.7,
              background: "var(--bg-inset)", border: "none", outline: "none",
              color: "var(--ink)", resize: "none",
            }}
          />
        ) : (
          <div
            style={{
              height: "100%", overflowY: "auto", padding: "20px 24px",
              fontSize: 14, lineHeight: 1.7, color: "var(--ink-soft)",
            }}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
          />
        )}
      </div>
    </div>
  )
}
