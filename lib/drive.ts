export type DriveFile = {
  id: string
  name: string
  mimeType: string
  parents: string[]
  modifiedTime: string
  createdTime: string
  size: string | null
  webViewLink: string
  iconLink: string
  starred: boolean
  trashed: boolean
}

export type DriveFolder = DriveFile & {
  mimeType: 'application/vnd.google-apps.folder'
}

export type DriveRoot = {
  id: 'rrr' | 'braosa-universe'
  label_pt: string
  label_en: string
  description_pt: string
  description_en: string
  color: string
  glyph: string
  folderId: string | null
}

export const DRIVE_ROOTS: DriveRoot[] = [
  {
    id: 'rrr',
    label_pt: 'RRR — Repositório de Investigação',
    label_en: 'RRR — Research Repository',
    description_pt: 'Wiki pessoal — investigação, notas e referências',
    description_en: 'Personal wiki — research, notes and references',
    color: 'var(--c-task)',
    glyph: 'file',
    folderId: null,
  },
  {
    id: 'braosa-universe',
    label_pt: 'Braosa Universe',
    label_en: 'Braosa Universe',
    description_pt: 'Worldbuilding — personagens, mundos, lore e campanhas',
    description_en: 'Worldbuilding — characters, worlds, lore and campaigns',
    color: 'var(--c-braosa)',
    glyph: 'wand',
    folderId: null,
  },
]

export const MARKDOWN_MIME = 'text/markdown'
export const FOLDER_MIME = 'application/vnd.google-apps.folder'

export function isFolder(file: DriveFile): boolean {
  return file.mimeType === FOLDER_MIME
}

export function isMarkdown(file: DriveFile): boolean {
  return (
    file.mimeType === MARKDOWN_MIME ||
    file.mimeType === 'text/plain' ||
    file.name.endsWith('.md')
  )
}

export function getFileIcon(file: DriveFile): string {
  if (isFolder(file)) return 'archive'
  if (isMarkdown(file)) return 'file'
  if (file.mimeType.startsWith('image/')) return 'camera'
  if (file.mimeType.includes('document')) return 'note'
  return 'file'
}
