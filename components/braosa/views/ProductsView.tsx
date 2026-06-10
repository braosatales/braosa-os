'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '@/components/ui'
import { L, useLang } from '@/lib/i18n'
import { BraosaProduct, PRODUCT_STATUS_META, ATELIER_TOOLS } from '@/lib/braosa'
import AddProductModal from '../modals/AddProductModal'

type KanbanStatus = 'planned' | 'in_progress' | 'beta' | 'live'
const KANBAN_COLUMNS: KanbanStatus[] = ['planned', 'in_progress', 'beta', 'live']

const PRIORITY_COLORS: Record<number, string> = { 1: 'var(--p1)', 2: 'var(--p2)', 3: 'var(--p3)' }

function ProductCard({ product, onEdit, onDelete, isDragging }: {
  product: BraosaProduct
  onEdit: (p: BraosaProduct) => void
  onDelete: (id: string) => void
  isDragging?: boolean
}) {
  useLang()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const statusMeta = PRODUCT_STATUS_META[product.status]

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--bg-raised)',
        border: '1px solid var(--edge)',
        borderRadius: 'var(--radius-sm)',
        padding: '14px 16px',
        marginBottom: 8,
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span
          {...attributes}
          {...listeners}
          style={{ color: 'var(--ink-faint)', cursor: 'grab', flexShrink: 0, marginTop: 2 }}
        >
          <Icon name="drag" size={14} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
              {product.name}
            </span>
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
              padding: '2px 5px', borderRadius: 4,
              background: 'var(--bg-raised-2)', color: 'var(--ink-dim)',
            }}>
              {product.category}
            </span>
          </div>

          {product.description && (
            <div style={{
              fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.45,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              marginBottom: 8,
            }}>
              {product.description}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 99,
              background: `color-mix(in oklch, ${statusMeta.color} 15%, transparent)`,
              color: statusMeta.color, fontWeight: 600,
            }}>
              {L(statusMeta.label_pt, statusMeta.label_en)}
            </span>
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 4,
              background: `color-mix(in oklch, ${PRIORITY_COLORS[product.priority] ?? 'var(--ink-faint)'} 18%, transparent)`,
              color: PRIORITY_COLORS[product.priority] ?? 'var(--ink-faint)',
            }}>
              P{product.priority}
            </span>
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 10, color: 'var(--c-braosa)', textDecoration: 'none' }}
                onClick={e => e.stopPropagation()}
              >
                <Icon name="link" size={10} />
              </a>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(product)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 4 }}
          >
            <Icon name="edit" size={12} />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: 4 }}
          >
            <Icon name="trash" size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function KanbanColumn({ status, products, activeId, onEdit, onDelete }: {
  status: KanbanStatus
  products: BraosaProduct[]
  activeId: string | null
  onEdit: (p: BraosaProduct) => void
  onDelete: (id: string) => void
}) {
  useLang()
  const meta = PRODUCT_STATUS_META[status]

  return (
    <div style={{
      flex: '0 0 240px',
      minWidth: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 12, padding: '0 4px',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>
          {L(meta.label_pt, meta.label_en)}
        </span>
        <span style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', padding: '1px 7px',
          borderRadius: 99,
          background: `color-mix(in oklch, ${meta.color} 14%, transparent)`,
          color: meta.color,
        }}>
          {products.length}
        </span>
      </div>

      <SortableContext items={products.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div
          data-column={status}
          style={{
            minHeight: 120,
            padding: '4px',
            borderRadius: 'var(--radius)',
            border: '1px dashed var(--edge-soft)',
            background: 'var(--bg-inset)',
          }}
        >
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={onEdit}
              onDelete={onDelete}
              isDragging={p.id === activeId}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export default function ProductsView() {
  useLang()
  const [products, setProducts] = useState<BraosaProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<BraosaProduct | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/braosa/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleImportAtelier = async () => {
    setImporting(true)
    try {
      await Promise.all(
        ATELIER_TOOLS.map((name, i) =>
          fetch('/api/braosa/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category: 'tool', status: 'planned', priority: 3, order_index: i }),
          })
        )
      )
      await fetchProducts()
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/braosa/products/${id}`, { method: 'DELETE' })
  }

  // Group products by kanban status
  const columnProducts = (status: KanbanStatus) =>
    products
      .filter(p => p.status === status)
      .sort((a, b) => a.order_index - b.order_index || a.priority - b.priority)

  function findContainer(id: string): KanbanStatus | null {
    const p = products.find(p => p.id === id)
    if (!p) return null
    if (KANBAN_COLUMNS.includes(p.status as KanbanStatus)) return p.status as KanbanStatus
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeContainer = findContainer(String(active.id))
    let overContainer = findContainer(String(over.id))

    // Check if over.id is a column id
    if (!overContainer && KANBAN_COLUMNS.includes(String(over.id) as KanbanStatus)) {
      overContainer = String(over.id) as KanbanStatus
    }

    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    // Move to new column (status change)
    setProducts(prev => prev.map(p =>
      p.id === String(active.id) ? { ...p, status: overContainer! } : p
    ))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeProduct = products.find(p => p.id === activeId)
    if (!activeProduct) return

    // Determine target column
    let targetStatus = findContainer(overId) ?? (KANBAN_COLUMNS.includes(overId as KanbanStatus) ? overId as KanbanStatus : null)
    if (!targetStatus) return

    // If cross-column: update status in DB
    if (activeProduct.status !== targetStatus) {
      fetch(`/api/braosa/products/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })
    }

    // Reorder within column
    const colItems = products
      .filter(p => p.id === activeId ? true : p.status === targetStatus)
      .filter(p => p.status === targetStatus || p.id === activeId)
      .sort((a, b) => a.order_index - b.order_index)

    const activeIdx = colItems.findIndex(p => p.id === activeId)
    const overIdx = colItems.findIndex(p => p.id === overId)

    if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
      const reordered = arrayMove(colItems, activeIdx, overIdx)
      const updates = reordered.map((p, i) => ({ id: p.id, order_index: i }))

      setProducts(prev => {
        const map = new Map(updates.map(u => [u.id, u.order_index]))
        return prev.map(p => map.has(p.id) ? { ...p, order_index: map.get(p.id)! } : p)
      })

      fetch('/api/braosa/products/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updates }),
      })
    }
  }

  const activeProduct = products.find(p => p.id === activeId)

  const STATUS_FILTERS = [
    { value: 'all',         label_pt: 'Todos',        label_en: 'All' },
    { value: 'planned',     label_pt: 'Planeado',     label_en: 'Planned' },
    { value: 'in_progress', label_pt: 'Em Progresso', label_en: 'In Progress' },
    { value: 'beta',        label_pt: 'Beta',         label_en: 'Beta' },
    { value: 'live',        label_pt: 'Live',         label_en: 'Live' },
    { value: 'paused',      label_pt: 'Pausado',      label_en: 'Paused' },
  ]

  const filteredProducts = statusFilter === 'all' ? products : products.filter(p => p.status === statusFilter)
  const isKanban = statusFilter === 'all' || KANBAN_COLUMNS.includes(statusFilter as KanbanStatus)

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--ink-faint)', fontSize: 13 }}>{L('A carregar…', 'Loading…')}</div>
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
            {L('Atelier — Produtos', 'Atelier — Products')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 3 }}>
            {L('O ecossistema de ferramentas BraosaTales', 'The BraosaTales tools ecosystem')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {products.length === 0 && (
            <button
              className="btn"
              onClick={handleImportAtelier}
              disabled={importing}
            >
              <Icon name="wand" size={13} />
              {importing ? L('A importar…', 'Importing…') : L('Importar Atelier', 'Import Atelier')}
            </button>
          )}
          <button
            className="btn btn-accent"
            style={{ '--accent': 'var(--c-braosa)' } as React.CSSProperties}
            onClick={() => { setEditingProduct(null); setModalOpen(true) }}
          >
            <Icon name="plus" size={14} />
            {L('Novo Produto', 'New Product')}
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => {
          const isActive = statusFilter === f.value
          return (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 99,
                border: `1px solid ${isActive ? 'var(--c-braosa)' : 'var(--edge)'}`,
                background: isActive ? 'color-mix(in oklch, var(--c-braosa) 14%, transparent)' : 'transparent',
                color: isActive ? 'var(--c-braosa)' : 'var(--ink-dim)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {L(f.label_pt, f.label_en)}
            </button>
          )
        })}
      </div>

      {products.length === 0 ? (
        <div style={{
          background: 'var(--bg-raised)', border: '1px solid var(--edge)', borderRadius: 'var(--radius)',
          padding: '32px 24px', textAlign: 'center',
        }}>
          <div style={{ color: 'var(--ink-dim)', fontSize: 14, marginBottom: 12 }}>
            {L('Nenhum produto ainda. Importa o Atelier ou cria um novo.', 'No products yet. Import Atelier or create a new one.')}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn" onClick={handleImportAtelier} disabled={importing}>
              <Icon name="wand" size={13} />
              {L('Importar Atelier (22 ferramentas)', 'Import Atelier (22 tools)')}
            </button>
          </div>
        </div>
      ) : isKanban && statusFilter === 'all' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
            {KANBAN_COLUMNS.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                products={columnProducts(status)}
                activeId={activeId}
                onEdit={p => { setEditingProduct(p); setModalOpen(true) }}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeProduct ? (
              <div style={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--c-braosa)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                opacity: 0.92,
                boxShadow: '0 8px 24px -8px oklch(0 0 0 / 0.6)',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600 }}>
                  {activeProduct.name}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* Filtered list view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredProducts.map(product => (
            <div
              key={product.id}
              style={{
                background: 'var(--bg-raised)', border: '1px solid var(--edge)',
                borderRadius: 'var(--radius-sm)', padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>{product.name}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99,
                    background: `color-mix(in oklch, ${PRODUCT_STATUS_META[product.status].color} 14%, transparent)`,
                    color: PRODUCT_STATUS_META[product.status].color, fontWeight: 600,
                  }}>
                    {L(PRODUCT_STATUS_META[product.status].label_pt, PRODUCT_STATUS_META[product.status].label_en)}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>
                    P{product.priority}
                  </span>
                </div>
                {product.description && (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{product.description}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { setEditingProduct(product); setModalOpen(true) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 6 }}>
                  <Icon name="edit" size={13} />
                </button>
                <button onClick={() => handleDelete(product.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neg)', padding: 6 }}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddProductModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProduct(null) }}
        onSaved={fetchProducts}
        editing={editingProduct}
      />
    </div>
  )
}
