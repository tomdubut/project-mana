export async function GET(request: Request) {
  const url = new URL(request.url)
  const redirect_uri = url.searchParams.get('redirect_uri') ?? ''
  const state = url.searchParams.get('state') ?? ''
  const code_challenge = url.searchParams.get('code_challenge') ?? ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect Claude to Project Mana</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; width: 100%; max-width: 400px; }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #94a3b8; margin-bottom: 1.5rem; line-height: 1.5; }
    label { display: block; font-size: 0.8rem; font-weight: 500; color: #94a3b8; margin-bottom: 0.4rem; }
    input { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 0.6rem 0.8rem; color: #e2e8f0; font-size: 0.875rem; font-family: monospace; }
    input:focus { outline: none; border-color: #6366f1; }
    button { margin-top: 1rem; width: 100%; background: #6366f1; color: white; border: none; border-radius: 8px; padding: 0.7rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; }
    button:hover { background: #4f46e5; }
    .hint { margin-top: 1rem; font-size: 0.75rem; color: #64748b; }
    .hint a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Connect Claude to Project Mana</h1>
    <p>Paste your API token below to let Claude access your tasks, projects, and work streams.</p>
    <form method="POST">
      <input type="hidden" name="redirect_uri" value="${encodeURIComponent(redirect_uri)}">
      <input type="hidden" name="state" value="${encodeURIComponent(state)}">
      <input type="hidden" name="code_challenge" value="${encodeURIComponent(code_challenge)}">
      <label for="token">API Token</label>
      <input type="password" id="token" name="token" placeholder="pmana_..." autocomplete="off" required>
      <button type="submit">Authorize</button>
    </form>
    <p class="hint">Generate a token in <a href="/dashboard/settings" target="_blank">Settings → API Tokens</a>.</p>
  </div>
</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}

export async function POST(request: Request) {
  const form = await request.formData()
  const token = (form.get('token') as string ?? '').trim()
  const redirect_uri = decodeURIComponent(form.get('redirect_uri') as string ?? '')
  const state = decodeURIComponent(form.get('state') as string ?? '')

  if (!token || !redirect_uri) {
    return new Response('Missing token or redirect_uri', { status: 400 })
  }

  // Use the token itself as the code — token endpoint will just echo it back as access_token
  const redirectUrl = new URL(redirect_uri)
  redirectUrl.searchParams.set('code', token)
  if (state) redirectUrl.searchParams.set('state', state)

  return Response.redirect(redirectUrl.toString(), 302)
}
