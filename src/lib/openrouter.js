const KEY = import.meta.env.VITE_OPENROUTER_KEY

export async function aiCall(model, system, user, maxTokens = 8192) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://selisegroup.com',
      'X-Title': 'SELISE EOI Generator',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    const status = resp.status
    if (status === 429) throw new Error('RATE_LIMIT')
    if (status >= 500) throw new Error('SERVER_ERROR')
    throw new Error(err.error?.message || `API error ${status}`)
  }

  const data = await resp.json()
  const text = data.choices[0].message.content.trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`AI returned invalid JSON. Preview: ${text.slice(0, 200)}`)
  return JSON.parse(match[0])
}
