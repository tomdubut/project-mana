import { authenticateApiRequest, supabaseAdmin } from '@/lib/api-auth'

const TOOLS = [
  {
    name: 'list_tasks',
    description: 'List tasks, optionally filtered by status, priority, stream_id, or open_only',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'done'], description: 'Filter by status' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], description: 'Filter by priority' },
        stream_id: { type: 'string', description: 'Filter by work stream ID' },
        goal_id: { type: 'string', description: 'Filter by goal ID' },
        open_only: { type: 'boolean', description: 'If true, only return non-done tasks' },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task',
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
    name: 'list_goals',
    description: 'List all active goals with their associated streams and task progress',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_goal',
    description: 'Create a new goal',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        target_date: { type: 'string', description: 'ISO date string' },
      },
    },
  },
  {
    name: 'update_goal',
    description: 'Update an existing goal by ID',
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
    name: 'delete_goal',
    description: 'Delete a goal by ID',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'list_streams',
    description: 'List all active work streams',
    inputSchema: { type: 'object', properties: {} },
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
    description: 'Create a new work stream',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        color: { type: 'string', description: 'Hex color, e.g. #6366f1' },
        is_ongoing: { type: 'boolean' },
        deadline: { type: 'string', description: 'ISO date string' },
        goal_id: { type: 'string' },
      },
    },
  },
  {
    name: 'list_pages',
    description: 'List knowledge pages, optionally filtered by stream_id',
    inputSchema: {
      type: 'object',
      properties: {
        stream_id: { type: 'string', description: 'Filter by work stream ID' },
      },
    },
  },
  {
    name: 'create_page',
    description: 'Create a new knowledge page',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        content: { type: 'string', description: 'Page content in Markdown' },
        stream_id: { type: 'string' },
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

  if (name === 'list_tasks') {
    let q = db.from('tasks').select('*, stream:work_streams(id,name), goal:goals(id,title)')
      .eq('user_id', userId).order('created_at', { ascending: false })
    if (args.stream_id) q = q.eq('stream_id', args.stream_id)
    if (args.goal_id) q = q.eq('goal_id', args.goal_id)
    if (args.status) q = q.eq('status', args.status)
    if (args.priority) q = q.eq('priority', args.priority)
    if (args.open_only) q = q.in('status', ['todo', 'in_progress', 'blocked'])
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'create_task') {
    if (!args.title) throw new Error('title is required')
    const { data, error } = await db.from('tasks')
      .insert({ title: args.title, description: args.description ?? null, status: args.status ?? 'todo',
        priority: args.priority ?? 'normal', due_date: args.due_date ?? null,
        stream_id: args.stream_id ?? null, goal_id: args.goal_id ?? null, user_id: userId })
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

  if (name === 'list_goals') {
    const { data, error } = await db.from('goals')
      .select('*, streams:work_streams(id,name,color), tasks(id,status)')
      .eq('user_id', userId).eq('archived', false).order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const goals = (data ?? []).map((g: any) => {
      const tasks = g.tasks ?? []
      const done = tasks.filter((t: any) => t.status === 'done').length
      return { ...g, task_count: tasks.length, done_count: done, progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
    })
    return toolResult(goals)
  }

  if (name === 'create_goal') {
    if (!args.title) throw new Error('title is required')
    const { data, error } = await db.from('goals')
      .insert({ title: args.title, description: args.description ?? null, target_date: args.target_date ?? null, user_id: userId })
      .select().single()
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'update_goal') {
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

  if (name === 'delete_goal') {
    if (!args.id) throw new Error('id is required')
    const { data: existing } = await db.from('goals').select('id').eq('id', args.id).eq('user_id', userId).single()
    if (!existing) throw new Error('Goal not found')
    const { error } = await db.from('goals').delete().eq('id', args.id)
    if (error) throw new Error(error.message)
    return toolResult({ deleted: true })
  }

  if (name === 'list_streams') {
    const { data, error } = await db.from('work_streams')
      .select('*, goal:goals(id,title)').eq('user_id', userId).eq('archived', false).order('name')
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
        goal_id: args.goal_id ?? null, user_id: userId })
      .select().single()
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'list_pages') {
    let q = db.from('knowledge_pages').select('*, stream:work_streams(id,name,color)')
      .eq('user_id', userId).order('updated_at', { ascending: false })
    if (args.stream_id) q = q.eq('stream_id', args.stream_id)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'create_page') {
    if (!args.title) throw new Error('title is required')
    const { data, error } = await db.from('knowledge_pages')
      .insert({ title: args.title, content: args.content ?? '', stream_id: args.stream_id ?? null, user_id: userId })
      .select().single()
    if (error) throw new Error(error.message)
    return toolResult(data)
  }

  if (name === 'update_page') {
    if (!args.id) throw new Error('id is required')
    const { data: existing } = await db.from('knowledge_pages').select('id').eq('id', args.id).eq('user_id', userId).single()
    if (!existing) throw new Error('Page not found')
    const allowed = ['title', 'content', 'stream_id']
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
