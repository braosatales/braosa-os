"use client"

import { useState } from "react"
import WidgetShell from "../WidgetShell"
import { useNoteStore, NoteStore } from "@/lib/note-store"
import { L } from "@/lib/i18n"

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

export default function QuickNoteWidget(props: ShellProps) {
  const [input, setInput] = useState("")
  const [saving, setSaving] = useState(false)
  const { notes } = useNoteStore()
  const recent = notes.slice(0, 2)

  async function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const content = input.trim()
      if (!content || saving) return
      setSaving(true)
      try {
        await NoteStore.createNote({ content })
        setInput("")
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <WidgetShell title={L("Nota Rápida", "Quick Note")} color="var(--c-notes)" glyph="note" {...props}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={L("Capturar nota... (Enter para guardar)", "Capture note... (Enter to save)")}
          disabled={saving}
          style={{
            width: "100%",
            flex: 1,
            resize: "none",
            background: "var(--bg-inset)",
            border: "1px solid var(--edge-soft)",
            borderRadius: "var(--radius-sm)",
            color: "var(--ink)",
            fontSize: 12.5,
            padding: "8px 10px",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            opacity: saving ? 0.6 : 1,
            boxSizing: "border-box",
          }}
        />
        {recent.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recent.map(note => (
              <div
                key={note.id}
                style={{
                  fontSize: 11.5,
                  color: "var(--ink-faint)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingLeft: 2,
                }}
              >
                {note.title || note.content.split("\n")[0].trim() || L("Sem título", "Untitled")}
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetShell>
  )
}
