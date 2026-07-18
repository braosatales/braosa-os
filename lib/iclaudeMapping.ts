export type IClaudeTask = {
  id: string
  title: string
  description?: string
  system?: string
  important?: boolean
  urgent?: boolean
  due?: string | null
  status?: string
  estimate?: number
  source: 'iclaude'
  createdAt?: string
}

export type IClaudeProject = {
  id: string
  name: string
  world: 'personal' | 'verum' | 'braosa'
  status: 'active' | 'paused' | 'done'
  next_action?: string | null
}

export type IClaudeDecision = {
  decision: string
  world: 'personal' | 'verum' | 'braosa'
  date: string
}

export function mapIClaudeTaskToDB(task: IClaudeTask, userId: string): Record<string, unknown> {
  let priority = 3
  if (task.important && task.urgent) priority = 1
  else if (task.important && !task.urgent) priority = 2
  else if (!task.important && task.urgent) priority = 2

  const validSystems = ['personal', 'finances', 'health', 'email', 'calendar', 'braosa', 'verum']
  const system = task.system && validSystems.includes(task.system) ? task.system : 'personal'

  const validStatuses = ['todo', 'doing', 'done', 'cancelled']
  const status = task.status && validStatuses.includes(task.status) ? task.status : 'todo'

  return {
    user_id: userId,
    external_id: task.id,
    title: task.title,
    description: task.description ?? null,
    system,
    priority,
    status,
    estimated_mins: task.estimate && task.estimate > 0 ? task.estimate : null,
    due: task.due ?? null,
    source: 'iclaude',
    updated_at: new Date().toISOString(),
  }
}
