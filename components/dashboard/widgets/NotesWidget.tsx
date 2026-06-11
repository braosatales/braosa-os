"use client"

import WidgetShell from "../WidgetShell"
import { Icon, EmptyState } from "@/components/ui"
import { relativeTime } from "@/lib/date"
import { L } from "@/lib/i18n"
import { useNoteStore } from "@/lib/note-store"
import type { Note } from "@/lib/notes"

type ShellProps = {
  dragging?: boolean
  lifted?: boolean
  sizeBadge?: string
  onHandleDown?: (e: React.PointerEvent) => void
  onResizeDown?: (e: React.PointerEvent, corner: "se") => void
  onRemove?: () => void
}

type Props = ShellProps & { onNavigate: (id: string) => void }

export default function NotesWidget({ onNavigate, ...shellProps }: Props) {
  const { notes: allNotes, loading } = useNoteStore()
  const notes = [...allNotes].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5)

  function displayTitle(note: Note): string {
    if (note.title) return note.title
    const firstLine = note.content.split("\n")[0].trim()
    return firstLine || L("Sem título", "Untitled")
  }

  return (
    <WidgetShell title={L("Notas", "Notes")} color="var(--c-notes)" glyph="note" {...shellProps}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: 28, background: "var(--bg-raised-2)", borderRadius: 6, animation: `skeleton-pulse 1.2s ease-in-out ${i * 0.2}s infinite alternate` }} />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState icon="note" title={L("Sem notas ainda", "No notes yet")} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {notes.map((note) => (
              <div
                key={note.id}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px" }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: note.pinned ? "var(--c-notes)" : "transparent",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayTitle(note)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint)",
                    fontFamily: "var(--font-mono)",
                    flexShrink: 0,
                  }}
                >
                  {relativeTime(note.updated_at)}
                </span>
              </div>
            ))}
          </div>
        )}
        <button
          className="btn"
          type="button"
          onClick={() => onNavigate("notes")}
          style={{ marginTop: "auto", width: "100%" }}
        >
          <Icon name="plus" size={12} />
          {L("Nova nota", "New note")}
        </button>
      </div>
    </WidgetShell>
  )
}
