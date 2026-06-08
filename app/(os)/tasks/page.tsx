'use client'
import TasksShell from '@/components/tasks/TasksShell'

export default function TasksPage() {
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', height: '100%' }}>
      <TasksShell />
    </div>
  )
}
