import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { TOOLS, callTool } from '@/lib/mcp-tools'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const AI_TOOLS: Anthropic.Tool[] = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
}))

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const clientMessages: Anthropic.MessageParam[] = body.messages ?? []

  const today = new Date().toISOString().slice(0, 10)
  const systemPrompt = `You are an AI assistant built into Project Mana, a personal productivity app. Today is ${today}.

Help the user manage their tasks, projects, work streams, and knowledge pages. Use the provided tools to read and write data.
After taking any action (creating, updating, or deleting), briefly confirm what you did in one sentence.
Be concise. If the user asks a question without needing a tool, answer directly.`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        const messages: Anthropic.MessageParam[] = [...clientMessages]

        let keepGoing = true
        while (keepGoing) {
          const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: systemPrompt,
            tools: AI_TOOLS,
            messages,
          })

          // Emit text content
          for (const block of response.content) {
            if (block.type === 'text' && block.text) {
              send({ type: 'text', text: block.text })
            }
          }

          messages.push({ role: 'assistant', content: response.content })

          if (response.stop_reason === 'tool_use') {
            const toolUseBlocks = response.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            )
            const toolResults: Anthropic.ToolResultBlockParam[] = []

            for (const block of toolUseBlocks) {
              // Skip context loading from UI chips — too noisy
              if (block.name !== 'get_context') {
                send({ type: 'tool_start', name: block.name })
              }
              try {
                const result = await callTool(user.id, block.name, block.input as Record<string, unknown>)
                const resultText = result.content[0].text
                if (block.name !== 'get_context') {
                  send({ type: 'tool_done', name: block.name, result: resultText })
                }
                toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: resultText })
              } catch (err: any) {
                const errMsg = `Error: ${err.message}`
                if (block.name !== 'get_context') {
                  send({ type: 'tool_done', name: block.name, result: errMsg })
                }
                toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: errMsg, is_error: true })
              }
            }

            messages.push({ role: 'user', content: toolResults })
          } else {
            keepGoing = false
          }
        }
      } catch (err: any) {
        send({ type: 'error', message: err.message ?? 'Unknown error' })
      }

      send({ type: 'done' })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
