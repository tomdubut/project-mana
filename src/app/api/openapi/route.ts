import { apiOk } from '@/lib/api-auth'

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Project Mana API',
    description: 'Personal productivity API — manage goals, work streams, tasks, and knowledge pages across workspaces.',
    version: '1.0.0',
  },
  servers: [{ url: 'https://project-mana-kappa.vercel.app/api/v1' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API token generated in Project Mana Settings → API Tokens',
      },
    },
    schemas: {
      Workspace: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          color: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Goal: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          target_date: { type: 'string', format: 'date', nullable: true },
          archived: { type: 'boolean' },
          workspace_id: { type: 'string', format: 'uuid', nullable: true },
          progress: { type: 'integer', description: 'Percentage of done tasks' },
          task_count: { type: 'integer' },
          done_count: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Stream: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          color: { type: 'string' },
          is_ongoing: { type: 'boolean' },
          deadline: { type: 'string', format: 'date', nullable: true },
          goal_id: { type: 'string', format: 'uuid', nullable: true },
          workspace_id: { type: 'string', format: 'uuid', nullable: true },
          archived: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'done'] },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
          due_date: { type: 'string', format: 'date', nullable: true },
          stream_id: { type: 'string', format: 'uuid', nullable: true },
          goal_id: { type: 'string', format: 'uuid', nullable: true },
          workspace_id: { type: 'string', format: 'uuid', nullable: true },
          ai_score: { type: 'integer', nullable: true },
          ai_reason: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Page: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          content: { type: 'string' },
          stream_id: { type: 'string', format: 'uuid', nullable: true },
          workspace_id: { type: 'string', format: 'uuid', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/workspaces': {
      get: {
        operationId: 'listWorkspaces',
        summary: 'List all workspaces',
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Workspace' } } } } },
        },
      },
    },
    '/goals': {
      get: {
        operationId: 'listGoals',
        summary: 'List active goals',
        parameters: [
          { name: 'workspace_id', in: 'query', schema: { type: 'string' }, description: 'Filter by workspace' },
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Goal' } } } } },
        },
      },
      post: {
        operationId: 'createGoal',
        summary: 'Create a goal',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  target_date: { type: 'string', format: 'date' },
                  workspace_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Goal' } } } },
        },
      },
    },
    '/goals/{id}': {
      patch: {
        operationId: 'updateGoal',
        summary: 'Update a goal',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  target_date: { type: 'string', format: 'date' },
                  archived: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Goal' } } } } },
      },
      delete: {
        operationId: 'deleteGoal',
        summary: 'Delete a goal',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/streams': {
      get: {
        operationId: 'listStreams',
        summary: 'List active work streams',
        parameters: [
          { name: 'workspace_id', in: 'query', schema: { type: 'string' }, description: 'Filter by workspace' },
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Stream' } } } } },
        },
      },
      post: {
        operationId: 'createStream',
        summary: 'Create a work stream',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  color: { type: 'string' },
                  is_ongoing: { type: 'boolean' },
                  deadline: { type: 'string', format: 'date' },
                  goal_id: { type: 'string', format: 'uuid' },
                  workspace_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Stream' } } } } },
      },
    },
    '/streams/{id}': {
      patch: {
        operationId: 'updateStream',
        summary: 'Update a work stream',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  color: { type: 'string' },
                  is_ongoing: { type: 'boolean' },
                  deadline: { type: 'string', format: 'date' },
                  archived: { type: 'boolean' },
                  goal_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Stream' } } } } },
      },
      delete: {
        operationId: 'deleteStream',
        summary: 'Delete a work stream',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/tasks': {
      get: {
        operationId: 'listTasks',
        summary: 'List tasks',
        parameters: [
          { name: 'workspace_id', in: 'query', schema: { type: 'string' }, description: 'Filter by workspace' },
          { name: 'stream_id', in: 'query', schema: { type: 'string' }, description: 'Filter by stream' },
          { name: 'goal_id', in: 'query', schema: { type: 'string' }, description: 'Filter by goal' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'done'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] } },
          { name: 'open_only', in: 'query', schema: { type: 'boolean' }, description: 'Only return non-done tasks' },
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Task' } } } } },
        },
      },
      post: {
        operationId: 'createTask',
        summary: 'Create a task',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'done'] },
                  priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
                  due_date: { type: 'string', format: 'date' },
                  stream_id: { type: 'string', format: 'uuid' },
                  goal_id: { type: 'string', format: 'uuid' },
                  workspace_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Task' } } } } },
      },
    },
    '/tasks/{id}': {
      patch: {
        operationId: 'updateTask',
        summary: 'Update a task',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'done'] },
                  priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
                  due_date: { type: 'string', format: 'date' },
                  stream_id: { type: 'string', format: 'uuid' },
                  goal_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Task' } } } } },
      },
      delete: {
        operationId: 'deleteTask',
        summary: 'Delete a task',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/pages': {
      get: {
        operationId: 'listPages',
        summary: 'List knowledge pages',
        parameters: [
          { name: 'workspace_id', in: 'query', schema: { type: 'string' }, description: 'Filter by workspace' },
          { name: 'stream_id', in: 'query', schema: { type: 'string' }, description: 'Filter by stream' },
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Page' } } } } },
        },
      },
      post: {
        operationId: 'createPage',
        summary: 'Create a knowledge page',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                  stream_id: { type: 'string', format: 'uuid' },
                  workspace_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Page' } } } } },
      },
    },
    '/pages/{id}': {
      patch: {
        operationId: 'updatePage',
        summary: 'Update a knowledge page',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                  stream_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Page' } } } } },
      },
      delete: {
        operationId: 'deletePage',
        summary: 'Delete a knowledge page',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' } },
      },
    },
  },
}

export async function GET() {
  return Response.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  })
}
