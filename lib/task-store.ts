'use client'

import { useState, useEffect } from 'react'
import type { Task, Project } from './tasks'

let _tasks: Task[] = []
let _projects: Project[] = []
let _loading = false
let _fetched = false
const _listeners = new Set<() => void>()

export const TaskStore = {
  getTasks: () => _tasks,
  getProjects: () => _projects,
  isLoading: () => _loading,
  subscribe(fn: () => void) { _listeners.add(fn); return () => _listeners.delete(fn) },
  notify() { _listeners.forEach(fn => fn()) },
  invalidate() { _tasks = []; _projects = []; _fetched = false; TaskStore.fetch() },
  async fetch() {
    if (_loading) return
    _loading = true; _fetched = true; TaskStore.notify()
    try {
      const [tr, pr] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects'),
      ])
      if (tr.ok) { const d = await tr.json(); _tasks = d.tasks ?? [] }
      if (pr.ok) { const d = await pr.json(); _projects = d.projects ?? [] }
    } finally { _loading = false; TaskStore.notify() }
  },
  async addTask(data: Partial<Task>) {
    const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!r.ok) {
      const e = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
      console.error('addTask error:', e)
      throw new Error(e.error || `Request failed (${r.status})`)
    }
    const d = await r.json(); _tasks = [d.task, ..._tasks]; TaskStore.notify()
  },
  async updateTask(id: string, data: Partial<Task>) {
    _tasks = _tasks.map(t => t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t)
    TaskStore.notify()
    const r = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!r.ok) TaskStore.invalidate()
  },
  async toggleDone(id: string) {
    const task = _tasks.find(t => t.id === id)
    if (!task) return
    const newStatus = (task.status === 'done') ? 'todo' : 'done'
    await TaskStore.updateTask(id, { status: newStatus })
  },
  async toggleFav(id: string) {
    const task = _tasks.find(t => t.id === id)
    if (!task) return
    await TaskStore.updateTask(id, { is_favourite: !task.is_favourite })
  },
  async deleteTask(id: string) {
    _tasks = _tasks.filter(t => t.id !== id)
    TaskStore.notify()
    const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (!r.ok) TaskStore.invalidate()
  },
  async addProject(data: Partial<Project>) {
    const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!r.ok) {
      const e = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
      console.error('addProject error:', e)
      throw new Error(e.error || `Request failed (${r.status})`)
    }
    const d = await r.json(); _projects = [..._projects, d.project].sort((a, b) => a.name.localeCompare(b.name)); TaskStore.notify()
  },
  async updateProject(id: string, data: Partial<Project>) {
    _projects = _projects.map(p => p.id === id ? { ...p, ...data } : p)
    TaskStore.notify()
    const r = await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!r.ok) TaskStore.invalidate()
  },
  async deleteProject(id: string) {
    _projects = _projects.filter(p => p.id !== id)
    _tasks = _tasks.map(t => t.project_id === id ? { ...t, project_id: null } : t)
    TaskStore.notify()
    const r = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (!r.ok) TaskStore.invalidate()
  },
}

export function useTaskStore(): { tasks: Task[]; projects: Project[]; loading: boolean } {
  const [, rerender] = useState(0)
  useEffect(() => {
    const unsub = TaskStore.subscribe(() => rerender(n => n + 1))
    if (!_fetched && !_loading) TaskStore.fetch()
    return () => { unsub() }
  }, [])
  return { tasks: TaskStore.getTasks(), projects: TaskStore.getProjects(), loading: TaskStore.isLoading() }
}
