'use client'
import TasksShell from '@/components/tasks/TasksShell'

export default function TasksPage() {
  return (
    <div style={{ flex: '1 1 auto', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', maxWidth: 'none', alignSelf: 'stretch', minWidth: 0, background: 'transparent' }}>
      <TasksShell />
    </div>
  )
}
