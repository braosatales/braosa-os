export type NoteColor = "default" | "yellow" | "green" | "blue" | "purple" | "pink"

export type Note = {
  id: string; user_id: string; title: string | null; content: string
  color: NoteColor; pinned: boolean; archived: boolean
  tags: string[]; created_at: string; updated_at: string
}

export const NOTE_COLORS: Record<NoteColor, { bg: string; border: string; label: string }> = {
  default: { bg: "var(--bg-raised)",                                                  border: "var(--edge)",                                               label: "Default" },
  yellow:  { bg: "color-mix(in oklch, var(--c-fin) 10%, var(--bg-raised))",          border: "color-mix(in oklch, var(--c-fin) 30%, transparent)",         label: "Yellow" },
  green:   { bg: "color-mix(in oklch, var(--pos) 10%, var(--bg-raised))",            border: "color-mix(in oklch, var(--pos) 30%, transparent)",           label: "Green" },
  blue:    { bg: "color-mix(in oklch, var(--c-mail) 10%, var(--bg-raised))",         border: "color-mix(in oklch, var(--c-mail) 30%, transparent)",        label: "Blue" },
  purple:  { bg: "color-mix(in oklch, var(--c-task) 10%, var(--bg-raised))",         border: "color-mix(in oklch, var(--c-task) 30%, transparent)",        label: "Purple" },
  pink:    { bg: "color-mix(in oklch, var(--c-verum) 10%, var(--bg-raised))",        border: "color-mix(in oklch, var(--c-verum) 30%, transparent)",       label: "Pink" },
}
