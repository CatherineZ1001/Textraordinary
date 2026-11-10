import { createRemoteJWKSet, jwtVerify } from 'jose'

// Production stand-in for the dev server's /api/navigator proxy in vite.config.ts: netlify.toml
// routes /api/navigator/chat/completions here, and this attaches the NaviGator key from the
// NAVIGATOR_API_KEY environment variable. The endpoint is public, so to protect the key's credit
// it only serves signed-in users, only the app's model, and caps the reply length.

const NAVIGATOR_URL = 'https://api.ai.it.ufl.edu/v1/chat/completions'
const MODEL = process.env.VITE_NAVIGATOR_MODEL || 'gpt-oss-120b'
/** Includes the reasoning tokens of models like gpt-oss, so leave room beyond the visible reply. */
const MAX_TOKENS = 8192

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID

// Firebase ID tokens are checked with jose as Firebase documents for third-party libraries
// (https://firebase.google.com/docs/auth/admin/verify-id-tokens), rather than with firebase-admin,
// whose jwks-rsa dependency require()s the ESM-only jose and crashes in Netlify's function runtime.
// jose caches Google's public keys between requests.
const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

async function verifyIdToken(idToken: string, projectId: string) {
  const { payload } = await jwtVerify(idToken, googleKeys, {
    algorithms: ['RS256'],
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  })
  const now = Date.now() / 1000
  if (!payload.sub) throw new Error('The ID token has no user.')
  if (typeof payload.auth_time !== 'number' || payload.auth_time > now) throw new Error('Invalid sign-in time.')
}

// Same error shape as the OpenAI API, so the openai client in the browser reports the message
const fail = (status: number, message: string) => Response.json({ error: { message } }, { status })

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return fail(405, 'Only POST is allowed.')

  const apiKey = process.env.NAVIGATOR_API_KEY
  if (!apiKey) return fail(500, 'NAVIGATOR_API_KEY is not set on the server.')
  if (!PROJECT_ID) return fail(500, 'VITE_FIREBASE_PROJECT_ID is not set on the server.')

  const idToken = req.headers.get('x-firebase-token')
  if (!idToken) return fail(401, 'Sign in to get AI feedback.')
  try {
    await verifyIdToken(idToken, PROJECT_ID)
  } catch {
    return fail(401, 'Your session has expired. Sign in again to get AI feedback.')
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'The request body must be JSON.')
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return fail(400, 'The request body must be a JSON object.')
  }
  const request = body as Record<string, unknown>
  if (request.model !== MODEL) return fail(400, `Only the ${MODEL} model is allowed.`)
  const maxTokens = typeof request.max_tokens === 'number' ? Math.min(request.max_tokens, MAX_TOKENS) : MAX_TOKENS

  let upstream: Response
  try {
    upstream = await fetch(NAVIGATOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ ...request, max_tokens: maxTokens, n: 1, stream: false }),
      signal: req.signal,
    })
  } catch {
    return fail(502, 'Could not reach NaviGator. Please try again.')
  }

  // A rejected key is a server problem; 401 is kept for the user's own sign-in
  if (upstream.status === 401) return fail(500, 'NaviGator rejected the server API key.')

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  })
}
