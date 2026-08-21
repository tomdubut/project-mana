import { authenticateApiRequest, supabaseAdmin } from '@/lib/api-auth'

const TOOLS = [
  {
    name: 'get_context',
    description: 'ALWAYS call this tool first before doing anything else in Project Mana. It returns how the app is structured, the rules you must follow, and your current data overview.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_workspaces',
    description: 'List all workspaces for the user',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_tasks',
    description: 'List tasks, optionally filtered by status, priority, stream_id, open_only, or workspace_id',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'done'], description: 'Filter by status' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], description: 'Filter by priority' },
        stream_id: { type: 'string', description: 'Filter by work stream ID' },
        goal_id: { type: 'string', description: 'Filter by goal ID' },
        open_only: { type: 'boolean', description: 'If true, only return non-done tasks' },
        workspace_id: { type: 'string', description: 'Filter by workspace ID' },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task. Pass stream_id when possible — workspace_id and goal_id are auto-resolved from the stream.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'done'] },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
        due_date: { type: 'string', description: 'ISO date string' },
        stream_id: { type: 'string' },
        goal_id: { type: 'string' },
        workspace_id: { type: 'string', description: 'Workspace ID to assign this task to' },
      },
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task by ID',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'done'] },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
        due_date: { type: 'string' },
        stream_id: { type: 'string' },
        goal_id: { type: 'string' },
      },
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task by ID',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'list_projects',
    description: 'List all active projects with their associated streams and task progress',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: { type: 'string', description: 'Filter by workspace ID' },
      },
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project. workspace_id is REQUIRED — always call list_workspaces first to get it.',
    inputSchema: {
      type: 'object',
      required: ['title', 'workspace_id'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        target_date: { type: 'string', description: 'ISO date string' },
        workspace_id: { type: 'string', description: 'Workspace ID to assign this project to' },
      },
    },
  },
  {
    name: 'update_project',
    description: 'Update an existing project by ID',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        target_date: { type: 'string' },
        archived: { type: 'boolean' },
      },
    },
  },
  {
    name: 'delete_project',
    description: 'Delete a project by ID',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'list_streams',
    description: 'List all active work streams',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: { type: 'string', description: 'Filter by workspace ID' },
      },
    },
  },
  {
    name: 'delete_stream',
    description: 'Delete a work stream by ID',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'create_stream',
    description: 'Create a new work stream. workspace_id is REQUIRED — always call list_workspaces first to get it.',
    inputSchema: {
      type: 'object',
      required: ['name', 'workspace_id'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        color: { type: 'string', description: 'Hex color, e.g. #6366f1' },
        is_ongoing: { type: 'boolean' },
        deadline: { type: 'string', description: 'ISO date string' },
        goal_id: { type: 'string' },
        workspace_id: { type: 'string', description: 'Workspace ID to assign this stream to' },
      },
    },
  },
  {
    name: 'list_pages',
    description: 'List knowledge pages, optionally filtered by goal_id, stream_id, or workspace_id',
    inputSchema: {
      type: 'object',
      properties: {
        goal_id: { type: 'string', description: 'Filter by project ID' },
        stream_id: { type: 'string', description: 'Filter by work stream ID' },
        workspace_id: { type: 'string', description: 'Filter by workspace ID' },
      },
    },
  },
  {
    name: 'create_page',
    description: 'Create a new knowledge page. workspace_id is REQUIRED — always call list_workspaces first to get it.',
    inputSchema: {
      type: 'object',
      required: ['title', 'workspace_id'],
      properties: {
        title: { type: 'string' },
        content: { type: 'string', description: 'Page content in Markdown' },
        goal_id: { type: 'string', description: 'Project ID to link this page to' },
        stream_id: { type: 'string' },
        workspace_id: { type: 'string', description: 'Workspace ID to assign this page to' },
      },
    },
  },
  {
    name: 'update_page',
    description: 'Update a knowledge page by ID',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        goal_id: { type: 'string' },
        stream_id: { type: 'string' },
      },
    },
  },
  {
    name: 'delete_page',
    description: 'Delete a knowledge page by ID',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
]

function mcpOk(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result }, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' },
  })
}

function mcpError(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } }, {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' },
  })
}

function toolResult(content: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(content, null, 2) }] }
}

async function callTool(userId: string, name: string, args: Record<string, unknown>) {
  const db = supabaseAdmin()

  if (name === 'get_context') {
    const [workspacesRes, goalsRes, streamsRes, tasksRes, pagesRes] = await Promise.all([
      db.from('workspaces').select('id, name, color').eq('user_id', userId).order('created_at'),
      db.from('goals').select('id, title, target_date, archived, workspace_id').eq('user_id', userId).eq('archived', false).order('created_at', { ascending: false }),
      db.from('work_streams').select('id, name, color, goal_id, archived, workspace_id').eq('user_id', userId).eq('archived', false).order('name'),
      db.from('tasks').select('id, title, status, priority, stream_id, goal_id, workspace_id').eq('user_id', userId).in('status', ['todo', 'in_progress', 'blocked']).order('created_at', { ascending: false }),
      db.from('knowledge_pages').select('id, title, stream_id, workspace_id').eq('user_id', userId).order('updated_at', { ascending: false }),
    ])

    const context = {
      instructions: `You are connected to Project Mana, a personal productivity app. Follow these rules every time:

WORKSPACES:
  - The user may have multiple workspaces (e.g. "Work", "Personal", "Side project")
  - Each workspace has its own projects, streams, tasks, and knowledge pages
  - ALWAYS call list_workspaces as your very first action — before anything else
  - When the user mentions a workspace by name, match it to the correct workspace_id
  - If the user does not specify a workspace, ask which one they mean — NEVER create anything without a workspace_id
  - NEVER call create_task, create_project, create_stream, or create_page without a workspace_id — items created without workspace_id will be invisible in the app
  - You cannot switch the active workspace in the user's browser (that is a UI action) — but you can read and write data in any workspace by passing the correct workspace_id to every tool

HIERARCHY (always respect this order):
  Projects → Work Streams → Tasks
  - A Project is the top-level objective (e.g. "Launch product", "Learn Spanish")
  - A Work Stream is a category of work under a Project (e.g. "Backend", "Marketing")
  - A Task is a concrete action item, optionally linked to a Stream and/or Project

BEFORE CREATING ANYTHING:
  1. Call list_workspaces — identify the appropriate workspace
  2. Call list_projects with workspace_id — check if a relevant project already exists
  3. Call list_streams with workspace_id — check if a relevant stream already exists under that project
  4. Only create a new project or stream if nothing relevant exists
  5. Always link tasks to the most relevant existing stream and project when possible

CREATION ORDER (if starting fresh):
  1. Create the Project first (with workspace_id)
  2. Create the Stream under that Project (set goal_id and workspace_id)
  3. Create Tasks linked to the Stream (set stream_id, goal_id, and workspace_id)

KNOWLEDGE PAGES:
  - Use create_page / update_page to store notes, documentation, research, or reference material
  - Link pages to a project or stream when the content belongs to a specific area of work
  - Always pass workspace_id when creating pages

GENERAL RULES:
  - Never create duplicate projects or streams — always reuse existing ones when relevant
  - When marking a task done, use update_task with status: "done"
  - Priorities: urgent > high > normal > low
  - Task statuses: todo, in_progress, blocked, done`,

      current_state: {
        workspaces: workspacesRes.data ?? [],
        projects: goalsRes.data ?? [],
        streams: streamsRes.data ?? [],
        open_tasks: tasksRes.data ?? [],
        knowledge_pages: pagesRes.data ?? [],
      },
    }

    return toolResult(context)
  }

  if (name === 'list_workspaces') {
    const { data, error } = await db.from('workspaces').select('*').eq('user_id', userId).order('created_at')
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'list_tasks') {
    let q = db.from('tasks').select('*, stream:work_streams(id,name), goal:goals(id,title)')
      .eq('user_id', userId).order('created_at', { ascending: false })
    if (args.stream_id) q = q.eq('stream_id', args.stream_id)
    if (args.goal_id) q = q.eq('goal_id', args.goal_id)
    if (args.status) q = q.eq('status', args.status)
    if (args.priority) q = q.eq('priority', args.priority)
    if (args.open_only) q = q.in('status', ['todo', 'in_progress', 'blocked'])
    if (args.workspace_id) q = q.eq('workspace_id', args.workspace_id)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'create_task') {
    if (!args.title) throw new Error('title is required')
    let workspaceId = args.workspace_id ?? null
    let goalId = args.goal_id ?? null
    if (args.stream_id) {
      const { data: stream } = await db.from('work_streams').select('goal_id, workspace_id').eq('id', args.stream_id).single()
      if (stream) {
        if (!workspaceId && stream.workspace_id) workspaceId = stream.workspace_id
        if (!goalId && stream.goal_id) goalId = stream.goal_id
      }
    }
    if (!workspaceId) {
      const { data: ws } = await db.from('workspaces').select('id').eq('user_id', userId).order('created_at').limit(1).single()
      if (ws) workspaceId = ws.id
    }
    const { data, error } = await db.from('tasks')
      .insert({ title: args.title, description: args.description ?? null, status: args.status ?? 'todo',
        priority: args.priority ?? 'normal', due_date: args.due_date ?? null,
        stream_id: args.stream_id ?? null, goal_id: goalId, user_id: userId,
        workspace_id: workspaceId })
      .select().single()
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'update_task') {
    if (!args.id) throw new Error('id is required')
    const { data: existing } = await db.from('tasks').select('id').eq('id', args.id).eq('user_id', userId).single()
    if (!existing) throw new Error('Task not found')
    const allowed = ['title', 'description', 'status', 'priority', 'due_date', 'stream_id', 'goal_id']
    const updates: Record<string, unknown> = {}
    for (const k of allowed) { if (k in args) updates[k] = args[k] }
    if (updates.status === 'done') updates.completed_at = new Date().toISOString()
    else if (updates.status) updates.completed_at = null
    const { data, error } = await db.from('tasks').update(updates).eq('id', args.id).select().single()
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'delete_task') {
    if (!args.id) throw new Error('id is required')
    const { data: existing } = await db.from('tasks').select('id').eq('id', args.id).eq('user_id', userId).single()
    if (!existing) throw new Error('Task not found')
    const { error } = await db.from('tasks').delete().eq('id', args.id)
    if (error) throw new Error(error.message)
    return toolResult({ deleted: true })
  }

  if (name === 'list_projects') {
    let q = db.from('goals')
      .select('*, streams:work_streams(id,name,color), tasks(id,status)')
      .eq('user_id', userId).eq('archived', false).order('created_at', { ascending: false })
    if (args.workspace_id) q = q.eq('workspace_id', args.workspace_id)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const goals = (data ?? []).map((g: any) => {
      const tasks = g.tasks ?? []
      const done = tasks.filter((t: any) => t.status === 'done').length
      return { ...g, task_count: tasks.length, done_count: done, progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
    })
    return toolResult(goals)
  }

  if (name === 'create_project') {
    if (!args.title) throw new Error('title is required')
    const { data, error } = await db.from('goals')
      .insert({ title: args.title, description: args.description ?? null, target_date: args.target_date ?? null, user_id: userId,
        workspace_id: args.workspace_id ?? null })
      .select().single()
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'update_project') {
    if (!args.id) throw new Error('id is required')
    const { data: existing } = await db.from('goals').select('id').eq('id', args.id).eq('user_id', userId).single()
    if (!existing) throw new Error('Goal not found')
    const allowed = ['title', 'description', 'target_date', 'archived']
    const updates: Record<string, unknown> = {}
    for (const k of allowed) { if (k in args) updates[k] = args[k] }
    const { data, error } = await db.from('goals').update(updates).eq('id', args.id).select().single()
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'delete_project') {
    if (!args.id) throw new Error('id is required')
    const { data: existing } = await db.from('goals').select('id').eq('id', args.id).eq('user_id', userId).single()
    if (!existing) throw new Error('Goal not found')
    const { error } = await db.from('goals').delete().eq('id', args.id)
    if (error) throw new Error(error.message)
    return toolResult({ deleted: true })
  }

  if (name === 'list_streams') {
    let q = db.from('work_streams')
      .select('*, goal:goals(id,title)').eq('user_id', userId).eq('archived', false).order('name')
    if (args.workspace_id) q = q.eq('workspace_id', args.workspace_id)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'delete_stream') {
    if (!args.id) throw new Error('id is required')
    const { data: existing } = await db.from('work_streams').select('id').eq('id', args.id).eq('user_id', userId).single()
    if (!existing) throw new Error('Stream not found')
    const { error } = await db.from('work_streams').delete().eq('id', args.id)
    if (error) throw new Error(error.message)
    return toolResult({ deleted: true })
  }

  if (name === 'create_stream') {
    if (!args.name) throw new Error('name is required')
    const { data, error } = await db.from('work_streams')
      .insert({ name: args.name, description: args.description ?? null, color: args.color ?? '#6366f1',
        is_ongoing: args.is_ongoing ?? true, deadline: args.deadline ?? null,
        goal_id: args.goal_id ?? null, user_id: userId, workspace_id: args.workspace_id ?? null })
      .select().single()
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'list_pages') {
    let q = db.from('knowledge_pages').select('*, stream:work_streams(id,name,color), goal:goals(id,title)')
      .eq('user_id', userId).order('updated_at', { ascending: false })
    if (args.goal_id) q = q.eq('goal_id', args.goal_id)
    if (args.stream_id) q = q.eq('stream_id', args.stream_id)
    if (args.workspace_id) q = q.eq('workspace_id', args.workspace_id)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'create_page') {
    if (!args.title) throw new Error('title is required')
    const { data, error } = await db.from('knowledge_pages')
      .insert({ title: args.title, content: args.content ?? '', stream_id: args.stream_id ?? null,
        goal_id: args.goal_id ?? null, user_id: userId, workspace_id: args.workspace_id ?? null })
      .select().single()
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'update_page') {
    if (!args.id) throw new Error('id is required')
    const { data: existing } = await db.from('knowledge_pages').select('id').eq('id', args.id).eq('user_id', userId).single()
    if (!existing) throw new Error('Page not found')
    const allowed = ['title', 'content', 'stream_id', 'goal_id']
    const updates: Record<string, unknown> = {}
    for (const k of allowed) { if (k in args) updates[k] = args[k] }
    const { data, error } = await db.from('knowledge_pages').update(updates).eq('id', args.id).select().single()
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'delete_page') {
    if (!args.id) throw new Error('id is required')
    const { data: existing } = await db.from('knowledge_pages').select('id').eq('id', args.id).eq('user_id', userId).single()
    if (!existing) throw new Error('Page not found')
    const { error } = await db.from('knowledge_pages').delete().eq('id', args.id)
    if (error) throw new Error(error.message)
    return toolResult({ deleted: true })
  }

  throw new Error(`Unknown tool: ${name}`)
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
}

export async function POST(request: Request) {
  const userId = await authenticateApiRequest(request)
  if (!userId) {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } }, {
      status: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return mcpError(null, -32700, 'Parse error')
  }

  const { jsonrpc, id, method, params } = body

  if (jsonrpc !== '2.0') return mcpError(id, -32600, 'Invalid Request')

  if (method === 'initialize') {
    return mcpOk(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'project-mana', version: '1.0.0' },
    })
  }

  if (method === 'tools/list') {
    return mcpOk(id, { tools: TOOLS })
  }

  if (method === 'tools/call') {
    const toolName = params?.name as string
    const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>
    try {
      const result = await callTool(userId, toolName, toolArgs)
      return mcpOk(id, result)
    } catch (e: any) {
      return mcpOk(id, { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true })
    }
  }

  if (method === 'notifications/initialized') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  return mcpError(id, -32601, `Method not found: ${method}`)
}
