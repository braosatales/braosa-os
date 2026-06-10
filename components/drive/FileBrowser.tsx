"use client"

import { useState, useEffect } from "react"
import type { DriveFile } from "@/lib/drive"
import { isFolder, isMarkdown, getFileIcon } from "@/lib/drive"
import { Icon, EmptyState } from "@/components/ui"
import { useLang } from "@/lib/i18n"
import { relativeTime } from "@/lib/date"
import type { IconName } from "@/lib/icons"
import CreateFileModal from "./CreateFileModal"

type BreadcrumbEntry = { id: string; name: string }

type Props = {
  rootId: string
  folderId: string
  rootLabel: string
  onFileSelect: (file: DriveFile) => void
  onFolderNavigate: (id: string, name: string) => void
}

function formatSize(size: string | null): string {
  if (!size) return ""
  const n = parseInt(size)
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}

export default function FileBrowser({ rootId, folderId, rootLabel, onFileSelect, onFolderNavigate }: Props) {
  const lang = useLang()
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"grid" | "list">("list")
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([{ id: folderId, name: rootLabel }])
  const [createOpen, setCreateOpen] = useState(false)
  const [menuFile, setMenuFile] = useState<DriveFile | null>(null)

  const currentFolder = breadcrumb[breadcrumb.length - 1]

  useEffect(() => {
    setBreadcrumb([{ id: folderId, name: rootLabel }])
  }, [folderId, rootLabel])

  useEffect(() => {
    loadFiles(currentFolder.id)
  }, [currentFolder.id])

  async function loadFiles(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/drive/files?folderId=${id}&rootId=${rootId}`)
      const data = await res.json()
      setFiles(data.files ?? [])
    } finally {
      setLoading(false)
    }
  }

  function navigateInto(file: DriveFile) {
    const next = [...breadcrumb, { id: file.id, name: file.name }]
    setBreadcrumb(next)
    onFolderNavigate(file.id, file.name)
  }

  function navigateTo(index: number) {
    const next = breadcrumb.slice(0, index + 1)
    setBreadcrumb(next)
  }

  function handleFileClick(file: DriveFile) {
    if (isFolder(file)) {
      navigateInto(file)
    } else if (isMarkdown(file)) {
      onFileSelect(file)
    } else {
      window.open(file.webViewLink, "_blank", "noopener")
    }
  }

  async function handleDelete(file: DriveFile) {
    if (!confirm(lang === "pt" ? `Mover "${file.name}" para o lixo?` : `Move "${file.name}" to trash?`)) return
    await fetch(`/api/drive/files/${file.id}`, { method: "DELETE" })
    loadFiles(currentFolder.id)
    setMenuFile(null)
  }

  const skeletonRows = Array.from({ length: 4 })

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px 8px", flexShrink: 0, flexWrap: "wrap" }}>
        {breadcrumb.map((entry, i) => (
          <span key={entry.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>›</span>}
            <button
              onClick={() => navigateTo(i)}
              style={{
                background: "none", border: "none", cursor: i < breadcrumb.length - 1 ? "pointer" : "default",
                fontSize: 13, color: i < breadcrumb.length - 1 ? "var(--ink-dim)" : "var(--ink)",
                fontWeight: i < breadcrumb.length - 1 ? 400 : 600, padding: 0,
              }}
            >
              {entry.name}
            </button>
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px 12px", flexShrink: 0 }}>
        <button className="btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={13} />
          {lang === "pt" ? "Novo Ficheiro" : "New File"}
        </button>
        <button className="btn" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setCreateOpen(true)}>
          <Icon name="archive" size={13} />
          {lang === "pt" ? "Nova Pasta" : "New Folder"}
        </button>
        <div style={{ flex: 1 }} />
        {(["list", "grid"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "var(--radius-sm)", border: `1px solid ${view === v ? "var(--edge-strong)" : "transparent"}`,
              background: view === v ? "var(--bg-raised-2)" : "transparent",
              color: view === v ? "var(--ink)" : "var(--ink-faint)", cursor: "pointer",
            }}
          >
            <Icon name={v === "list" ? "list" : "board"} size={14} />
          </button>
        ))}
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {skeletonRows.map((_, i) => (
              <div key={i} style={{
                height: 44, borderRadius: "var(--radius-sm)", background: "var(--bg-raised-2)",
                animation: "skeleton-pulse 1.2s ease-in-out infinite alternate",
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            icon="file"
            title={lang === "pt" ? "Pasta vazia" : "Empty folder"}
            subtitle={lang === "pt" ? "Cria um ficheiro para começar" : "Create a file to get started"}
          />
        ) : view === "list" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {files.map(file => (
              <div
                key={file.id}
                className="task-row"
                onClick={() => handleFileClick(file)}
                onContextMenu={e => { e.preventDefault(); setMenuFile(file) }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 8, cursor: "pointer", position: "relative" }}
              >
                <span style={{ color: isFolder(file) ? "oklch(0.78 0.12 75)" : "var(--ink-faint)", flexShrink: 0 }}>
                  <Icon name={getFileIcon(file) as IconName} size={15} />
                </span>
                <span style={{ flex: 1, fontSize: 13, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.name}
                </span>
                {file.size && (
                  <span style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                    {formatSize(file.size)}
                  </span>
                )}
                <span style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                  {relativeTime(file.modifiedTime)}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); setMenuFile(menuFile?.id === file.id ? null : file) }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", padding: 2, borderRadius: 4, flexShrink: 0 }}
                >
                  <Icon name="dots" size={13} />
                </button>

                {menuFile?.id === file.id && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: "absolute", right: 8, top: "100%", zIndex: 100,
                      background: "var(--bg-raised)", border: "1px solid var(--edge)", borderRadius: "var(--radius-sm)",
                      boxShadow: "var(--shadow-pop)", padding: 4, minWidth: 140,
                    }}
                  >
                    {[
                      { label: lang === "pt" ? "Abrir no Drive" : "Open in Drive", action: () => { window.open(file.webViewLink, "_blank", "noopener"); setMenuFile(null) } },
                      { label: lang === "pt" ? "Apagar" : "Delete", action: () => handleDelete(file), danger: true },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        style={{
                          display: "block", width: "100%", textAlign: "left", padding: "7px 10px",
                          background: "none", border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)",
                          fontSize: 12, color: (item as any).danger ? "var(--neg)" : "var(--ink-soft)",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-raised-2)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Grid view */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {files.map(file => (
              <div
                key={file.id}
                onClick={() => handleFileClick(file)}
                style={{
                  background: "var(--bg-raised)", border: "1px solid var(--edge)", borderRadius: "var(--radius)",
                  padding: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  transition: "border-color .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--edge-strong)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--edge)")}
              >
                <span style={{ color: isFolder(file) ? "oklch(0.78 0.12 75)" : "var(--ink-dim)" }}>
                  <Icon name={getFileIcon(file) as IconName} size={32} />
                </span>
                <span style={{
                  fontSize: 13, color: "var(--ink-soft)", textAlign: "center",
                  overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                } as React.CSSProperties}>
                  {file.name}
                </span>
                <span style={{ fontSize: 10, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
                  {relativeTime(file.modifiedTime)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {menuFile && (
        <div
          onClick={() => setMenuFile(null)}
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
        />
      )}

      <CreateFileModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        parentId={currentFolder.id}
        onCreated={() => loadFiles(currentFolder.id)}
      />
    </div>
  )
}
