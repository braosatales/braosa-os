"use client"

import { useState, useEffect, useContext, useRef } from "react"
import type { DriveFile } from "@/lib/drive"
import { DRIVE_ROOTS } from "@/lib/drive"
import { Icon, EmptyState } from "@/components/ui"
import { useLang } from "@/lib/i18n"
import { useIsMobile } from "@/lib/hooks/useIsMobile"
import { MobileSubTabContext } from "@/lib/mobile-context"
import { relativeTime } from "@/lib/date"
import type { IconName } from "@/lib/icons"
import FileBrowser from "./FileBrowser"
import FileEditor from "./FileEditor"

type RecentFile = { id: string; name: string; rootId: string; modifiedTime: string }
const RECENT_KEY = "braosa-drive-recent"

function getRecent(): RecentFile[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") } catch { return [] }
}

function addRecent(file: DriveFile, rootId: string) {
  if (typeof window === "undefined") return
  const list = getRecent().filter(f => f.id !== file.id)
  list.unshift({ id: file.id, name: file.name, rootId, modifiedTime: file.modifiedTime })
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)))
}

type FolderIds = Record<string, string | null>

export default function DriveShell() {
  const lang = useLang()
  const isMobile = useIsMobile()
  const { activeSubTab: mobileSubTab } = useContext(MobileSubTabContext)

  const [folderIds, setFolderIds] = useState<FolderIds>({})
  const [resolving, setResolving] = useState(true)
  const [activeRootId, setActiveRootId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)
  const [searchQ, setSearchQ] = useState("")
  const [searchResults, setSearchResults] = useState<(DriveFile & { rootId: string })[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [recent, setRecent] = useState<RecentFile[]>([])
  const [mobileView, setMobileView] = useState<"browser" | "editor">("browser")
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync mobile sub-tab to root selection
  useEffect(() => {
    if (isMobile && mobileSubTab) {
      setActiveRootId(mobileSubTab)
      setSelectedFile(null)
      setSearchQ("")
      setSearchResults(null)
      setMobileView("browser")
    }
  }, [isMobile, mobileSubTab])

  useEffect(() => {
    setRecent(getRecent())
    const sessionKey = "braosa-drive-folders"
    const cached = sessionStorage.getItem(sessionKey)
    if (cached) {
      setFolderIds(JSON.parse(cached))
      setResolving(false)
      return
    }
    fetch("/api/drive/resolve", { method: "POST" })
      .then(r => r.json())
      .then(data => {
        setFolderIds(data)
        sessionStorage.setItem(sessionKey, JSON.stringify(data))
      })
      .catch(() => {})
      .finally(() => setResolving(false))
  }, [])

  function handleRootSelect(rootId: string) {
    setActiveRootId(rootId)
    setSelectedFile(null)
    setSearchQ("")
    setSearchResults(null)
  }

  function handleFileSelect(file: DriveFile, rootId: string) {
    setSelectedFile(file)
    addRecent(file, rootId)
    setRecent(getRecent())
    setMobileView("editor")
  }

  function handleSearch(q: string) {
    setSearchQ(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!q.trim()) { setSearchResults(null); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/drive/search?q=${encodeURIComponent(q)}&rootIds=rrr,braosa-universe`)
        const data = await res.json()
        setSearchResults(data.results ?? [])
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  const currentRootId = isMobile ? mobileSubTab || activeRootId : activeRootId
  const activeRoot = DRIVE_ROOTS.find(r => r.id === currentRootId)
  const activeFolderId = currentRootId ? folderIds[currentRootId] ?? null : null

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left sidebar — desktop only */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: "1px solid var(--edge)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "var(--bg-raised)",
      }}
        className="desktop-only"
      >
        <div style={{ padding: "16px 14px 10px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>
            Drive
          </div>

          {/* Root cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {DRIVE_ROOTS.map(root => {
              const isActive = currentRootId === root.id
              return (
                <button
                  key={root.id}
                  onClick={() => handleRootSelect(root.id)}
                  style={{
                    position: "relative", overflow: "hidden",
                    background: isActive ? `color-mix(in oklch, ${root.color} 12%, var(--bg-raised))` : "var(--bg-raised)",
                    border: `1px solid ${isActive ? root.color : "var(--edge)"}`,
                    borderRadius: "var(--radius)", padding: "14px 14px 14px 16px",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    transition: "border-color .15s, background .15s",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: root.color, opacity: isActive ? 1 : 0.3,
                    borderRadius: "var(--radius) var(--radius) 0 0",
                  }} />

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                      background: `color-mix(in oklch, ${root.color} 20%, var(--bg-raised-2))`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ color: root.color }}>
                        <Icon name={root.glyph as IconName} size={12} />
                      </span>
                    </div>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>
                      {lang === "pt" ? root.label_pt : root.label_en}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.4 }}>
                    {lang === "pt" ? root.description_pt : root.description_en}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--ink-faint)", pointerEvents: "none" }}>
              <Icon name="search" size={12} />
            </span>
            <input
              value={searchQ}
              onChange={e => handleSearch(e.target.value)}
              placeholder={lang === "pt" ? "Pesquisar ficheiros..." : "Search files..."}
              className="glow-focus"
              style={{
                width: "100%", padding: "7px 9px 7px 28px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--edge)", background: "var(--bg-inset)",
                color: "var(--ink)", fontSize: 12, outline: "none",
                "--accent": "var(--c-drive)",
              } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Recent files */}
        {recent.length > 0 && !searchQ && (
          <div style={{ padding: "0 14px 14px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.12em", color: "var(--ink-faint)", marginBottom: 8 }}>
              {lang === "pt" ? "RECENTES" : "RECENT"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {recent.map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    const root = DRIVE_ROOTS.find(r => r.id === f.rootId)
                    if (root) setActiveRootId(root.id)
                    setSelectedFile({ id: f.id, name: f.name, mimeType: "text/markdown", modifiedTime: f.modifiedTime, parents: [], createdTime: f.modifiedTime, size: null, webViewLink: "", iconLink: "", starred: false, trashed: false })
                    setMobileView("editor")
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: "var(--radius-sm)",
                    background: "none", border: "none", cursor: "pointer", textAlign: "left",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-raised-2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <Icon name="file" size={11} />
                  <span style={{ flex: 1, fontSize: 11, color: "var(--ink-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span style={{ fontSize: 9, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{relativeTime(f.modifiedTime)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Search results overlay */}
        {searchQ && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px 8px", borderBottom: "1px solid var(--edge)", flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {searching
                  ? (lang === "pt" ? "A pesquisar..." : "Searching...")
                  : `${searchResults?.length ?? 0} ${lang === "pt" ? "resultados" : "results"}`
                }
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px" }}>
              {!searching && (searchResults?.length ?? 0) === 0 && (
                <EmptyState icon="search" title={lang === "pt" ? "Sem resultados" : "No results"} />
              )}
              {(searchResults ?? []).map(file => (
                <div
                  key={file.id}
                  className="task-row"
                  onClick={() => handleFileSelect(file, file.rootId)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 8, cursor: "pointer" }}
                >
                  <Icon name="file" size={14} />
                  <span style={{ flex: 1, fontSize: 13, color: "var(--ink-soft)" }}>{file.name}</span>
                  <span style={{ fontSize: 10, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
                    {DRIVE_ROOTS.find(r => r.id === file.rootId)?.[lang === "pt" ? "label_pt" : "label_en"] ?? file.rootId}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No root selected */}
        {!searchQ && !currentRootId && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <EmptyState
              icon="archive"
              title={lang === "pt" ? "Seleciona um repositório" : "Select a repository"}
              subtitle={lang === "pt" ? "Escolhe RRR ou Braosa Universe para começar" : "Choose RRR or Braosa Universe to get started"}
            />
          </div>
        )}

        {/* Resolving */}
        {!searchQ && currentRootId && resolving && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontSize: 13 }}>
            {lang === "pt" ? "A resolver pastas..." : "Resolving folders..."}
          </div>
        )}

        {/* Folder not found */}
        {!searchQ && currentRootId && !resolving && !activeFolderId && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <EmptyState
              icon="warning"
              title={lang === "pt" ? "Pasta não encontrada" : "Folder not found"}
              subtitle={lang === "pt" ? "Verifica se a pasta existe no Google Drive" : "Check that the folder exists in Google Drive"}
            />
          </div>
        )}

        {/* Browser + editor split */}
        {!searchQ && currentRootId && !resolving && activeFolderId && (
          <>
            <div style={{
              width: selectedFile ? "40%" : "100%",
              flexShrink: 0, borderRight: selectedFile ? "1px solid var(--edge)" : "none",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
              className={mobileView === "editor" ? "desktop-only" : undefined}
            >
              <FileBrowser
                rootId={currentRootId}
                folderId={activeFolderId}
                rootLabel={lang === "pt" ? activeRoot!.label_pt : activeRoot!.label_en}
                onFileSelect={file => handleFileSelect(file, currentRootId)}
                onFolderNavigate={() => {}}
              />
            </div>

            {selectedFile ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
                className={mobileView === "browser" ? "desktop-only" : undefined}
              >
                <div className="mobile-only" style={{ padding: "10px 14px", borderBottom: "1px solid var(--edge)", flexShrink: 0 }}>
                  <button
                    className="btn"
                    style={{ fontSize: 12, padding: "6px 12px" }}
                    onClick={() => { setMobileView("browser"); setSelectedFile(null) }}
                  >
                    <Icon name="chevron-left" size={13} />
                    {lang === "pt" ? "Voltar" : "Back"}
                  </button>
                </div>
                <FileEditor
                  file={selectedFile}
                  onClose={() => { setSelectedFile(null); setMobileView("browser") }}
                  onSaved={updated => setSelectedFile(updated)}
                />
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                className="desktop-only"
              >
                <EmptyState
                  icon="file"
                  title={lang === "pt" ? "Seleciona um ficheiro para editar" : "Select a file to edit"}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
