"use client"

import { useState } from "react"
import { Modal } from "@/components/ui"
import { useLang } from "@/lib/i18n"
import { FOLDER_MIME, MARKDOWN_MIME } from "@/lib/drive"

type Props = {
  open: boolean
  onClose: () => void
  parentId: string
  onCreated: () => void
}

export default function CreateFileModal({ open, onClose, parentId, onCreated }: Props) {
  const lang = useLang()
  const [type, setType] = useState<"markdown" | "folder">("markdown")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    let finalName = name.trim()
    if (type === "markdown" && !finalName.endsWith(".md")) {
      finalName = finalName + ".md"
    }

    try {
      const res = await fetch("/api/drive/files/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          mimeType: type === "folder" ? FOLDER_MIME : MARKDOWN_MIME,
          parentId,
          content: type === "markdown" ? `# ${name.trim()}\n\n` : undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create")
      setName("")
      setType("markdown")
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div style={{ padding: "24px 24px 28px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 20 }}>
          {lang === "pt" ? "Novo item" : "New item"}
        </div>

        {/* Type selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {(["markdown", "folder"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              style={{
                flex: 1,
                padding: "9px 14px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${type === t ? "var(--c-task)" : "var(--edge)"}`,
                background: type === t ? "color-mix(in oklch, var(--c-task) 12%, var(--bg-raised))" : "var(--bg-raised-2)",
                color: type === t ? "var(--c-task)" : "var(--ink-dim)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t === "markdown"
                ? lang === "pt" ? "Ficheiro Markdown" : "Markdown File"
                : lang === "pt" ? "Pasta" : "Folder"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-dim)", display: "block", marginBottom: 6 }}>
              {lang === "pt" ? "Nome" : "Name"}
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={type === "markdown" ? "notas.md" : lang === "pt" ? "Nova Pasta" : "New Folder"}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--edge)",
                background: "var(--bg-inset)",
                color: "var(--ink)",
                fontSize: 14,
                outline: "none",
              }}
              className="glow-focus"
            />
            {type === "markdown" && name && !name.endsWith(".md") && (
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 5 }}>
                {lang === "pt" ? `Será guardado como "${name}.md"` : `Will be saved as "${name}.md"`}
              </div>
            )}
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "var(--neg)", padding: "8px 12px", background: "color-mix(in oklch, var(--neg) 12%, transparent)", borderRadius: "var(--radius-sm)" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn" onClick={onClose}>
              {lang === "pt" ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="submit"
              className="btn-accent btn"
              disabled={!name.trim() || loading}
              style={{ "--accent": "var(--c-task)" } as React.CSSProperties}
            >
              {loading ? (lang === "pt" ? "A criar..." : "Creating...") : (lang === "pt" ? "Criar" : "Create")}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
