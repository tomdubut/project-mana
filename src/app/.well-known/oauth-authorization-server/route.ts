export async function GET(request: Request) {
  const base = new URL(request.url).origin
  return Response.json({
    issuer: base,
    authorization_endpoint: `${base}/api/mcp/authorize`,
    token_endpoint: `${base}/api/mcp/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
