const KEY = import.meta.env.VITE_GEMINI_KEY

export async function aiCall(model, system, user, maxTokens = 8192) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  )

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    const status = resp.status
    const msg = err.error?.message || ''
    if (status === 429 || msg.toLowerCase().includes('quota')) throw new Error('RATE_LIMIT')
    if (status >= 500) throw new Error('SERVER_ERROR')
    throw new Error(msg || `API error ${status}`)
  }

  const data = await resp.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`AI returned invalid JSON. Preview: ${text.slice(0, 200)}`)
  return JSON.parse(match[0])
}
