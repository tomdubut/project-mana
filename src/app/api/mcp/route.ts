import { authenticateApiRequest } from '@/lib/api-auth'
import { TOOLS, callTool } from '@/lib/mcp-tools'

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
