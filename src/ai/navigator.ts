import OpenAI from 'openai'

// Client for UF's NaviGator Toolkit, which exposes the OpenAI Chat Completions API.
// Requests go through the /api/navigator proxy in vite.config.ts, which replaces the
// Authorization header with the real key from the NAVIGATOR_API_KEY environment variable.
// The key below is only a placeholder, so dangerouslyAllowBrowser exposes no secret.
// Never put the real key in browser code.

/** Personal UF keys include a free monthly credit for locally hosted models like this one. */
const DEFAULT_MODEL = import.meta.env.VITE_NAVIGATOR_MODEL || 'gpt-oss-120b'

let client: OpenAI | undefined
function getClient(): OpenAI {
  client ??= new OpenAI({
    baseURL: `${window.location.origin}/api/navigator`,
    apiKey: 'set-by-dev-server-proxy',
    dangerouslyAllowBrowser: true,
  })
  return client
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  /** Any model ID from https://docs.ai.it.ufl.edu/docs/navigator_models */
  model?: string
  temperature?: number
  maxTokens?: number
  /** Ask the model to reply with a JSON object (the prompt must also mention JSON). */
  json?: boolean
  signal?: AbortSignal
}

export class NavigatorError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'NavigatorError'
  }
}

/** True when the request was cancelled through its AbortSignal. */
export function isAbort(err: unknown): boolean {
  return err instanceof OpenAI.APIUserAbortError || (err instanceof DOMException && err.name === 'AbortError')
}

/** Sends a conversation to the model and returns the text of its reply. */
export async function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  let completion: OpenAI.Chat.ChatCompletion
  try {
    completion = await getClient().chat.completions.create(
      {
        model: options.model ?? DEFAULT_MODEL,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: options.json ? { type: 'json_object' } : undefined,
      },
      { signal: options.signal },
    )
  } catch (err) {
    if (isAbort(err) || !(err instanceof OpenAI.APIError)) throw err
    throw new NavigatorError(`NaviGator request failed (${err.status ?? 'network'}): ${err.message}`, err.status)
  }

  const content = completion.choices[0]?.message?.content
  if (!content) throw new NavigatorError('NaviGator returned no message content.')
  return content
}

/** Like chat(), but parses the reply as JSON. */
export async function chatJson<T>(messages: ChatMessage[], options: ChatOptions = {}): Promise<T> {
  const text = await chat(messages, { ...options, json: true })
  try {
    // Some models wrap JSON in a ```json fence even when asked not to
    return JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')) as T
  } catch {
    throw new NavigatorError('NaviGator reply was not valid JSON.')
  }
}
