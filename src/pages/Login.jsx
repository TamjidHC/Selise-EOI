import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const nav = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'forgot' | 'sent'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    nav('/generate')
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    setMode('sent')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={import.meta.env.VITE_SELISE_LOGO_URL}
            alt="SELISE"
            className="h-10 object-contain"
            onError={e => { e.target.replaceWith(Object.assign(document.createElement('div'), { className: 'text-2xl font-bold text-[#741B47]', textContent: 'SELISE' })) }}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {mode === 'login' && (
            <>
              <h1 className="text-xl font-bold text-gray-800 mb-1">EOI Generator</h1>
              <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required placeholder="you@selise.ch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#741B47]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#741B47]"
                  />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
                <button
                  type="submit" disabled={loading}
                  className="w-full py-2.5 bg-[#741B47] text-white rounded-lg text-sm font-semibold hover:bg-[#5a1436] disabled:bg-gray-300 transition-colors"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              <button onClick={() => { setMode('forgot'); setError('') }} className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline w-full text-center">
                Forgot your password?
              </button>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h1 className="text-xl font-bold text-gray-800 mb-1">Reset password</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required placeholder="you@selise.ch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#741B47]"
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-2.5 bg-[#741B47] text-white rounded-lg text-sm font-semibold hover:bg-[#5a1436] disabled:bg-gray-300 transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <button onClick={() => setMode('login')} className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline w-full text-center">
                Back to login
              </button>
            </>
          )}

          {mode === 'sent' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <h2 className="font-bold text-gray-800 mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 mb-6">We've sent a reset link to <strong>{email}</strong></p>
              <button onClick={() => setMode('login')} className="text-sm text-[#741B47] underline">Back to login</button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Access by invite only — contact your administrator</p>
      </div>
    </div>
  )
}
