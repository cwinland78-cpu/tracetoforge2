import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabase'
import { suggestEmailFix } from '../lib/emailTypo'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const emailSuggestion = mode !== 'login' ? suggestEmailFix(email) : null
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()

  async function handleResendConfirmation() {
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      setSuccess('Confirmation email resent! Check your inbox and spam folder.')
    } catch (err) {
      setError(err.message || 'Failed to resend confirmation email')
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault?.()
    setError('')
    setSuccess('')
    setSentTo('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/editor/')
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        const data = await signUp(email, password, displayName)
        if (data?.user?.identities?.length === 0) {
          setError('An account with this email already exists')
        } else if (data?.user && !data?.session) {
          setSentTo(email.trim())
          setSuccess('')
          setShowResend(true)
        } else {
          navigate('/editor/')
        }
      } else if (mode === 'forgot') {
        await resetPassword(email)
        setSuccess('Password reset email sent! Check your inbox.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-orange-500">TracetoForge</h1>
            <p className="text-gray-400 text-sm mt-1">
              Photo to 3D-Printable Tray Inserts
            </p>
          </Link>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {sentTo && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg mb-4 text-sm">
              <p className="font-semibold text-green-200">Confirmation link sent to:</p>
              <p className="mt-1 font-mono text-white break-all">{sentTo}</p>
              <p className="mt-2 text-green-300/90">
                It usually lands in under a minute. Check spam if it has not shown up.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                <button
                  onClick={handleResendConfirmation}
                  className="text-orange-400 hover:text-orange-300 underline underline-offset-2 text-xs"
                >
                  Resend it
                </button>
                <button
                  onClick={() => {
                    setSentTo('')
                    setShowResend(false)
                    setError('')
                  }}
                  className="text-orange-400 hover:text-orange-300 underline underline-offset-2 text-xs"
                >
                  Not your email? Use a different one
                </button>
              </div>
            </div>
          )}

          {success && !sentTo && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg mb-4 text-sm">
              {success}
            </div>
          )}

          <div onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="mb-4">
                <label className="block text-gray-300 text-sm mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {emailSuggestion && (
                <p className="mt-1.5 text-sm text-amber-300/90">
                  Did you mean{' '}
                  <button
                    type="button"
                    onClick={() => setEmail(emailSuggestion)}
                    className="font-semibold text-amber-200 underline underline-offset-2 hover:text-amber-100 break-all"
                  >
                    {emailSuggestion}
                  </button>
                  ?
                </p>
              )}
            </div>

            {mode !== 'forgot' && (
              <div className="mb-6">
                <label className="block text-gray-300 text-sm mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </>
              )}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
            {mode === 'login' && (
              <>
                <p>
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('signup')
                      setError('')
                      setSuccess('')
                    setSentTo('')
                      setSentTo('')
                    }}
                    className="text-orange-400 hover:text-orange-300"
                  >
                    Sign Up
                  </button>
                </p>
                <p>
                  <button
                    onClick={() => {
                      setMode('forgot')
                      setError('')
                      setSuccess('')
                    setSentTo('')
                      setSentTo('')
                    }}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    Forgot Password?
                  </button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setSuccess('')
                    setSentTo('')
                  }}
                  className="text-orange-400 hover:text-orange-300"
                >
                  Sign In
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                <button
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setSuccess('')
                    setSentTo('')
                  }}
                  className="text-orange-400 hover:text-orange-300"
                >
                  Back to Sign In
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="text-center mt-4">
          <Link
            to="/editor/"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Continue as Guest (limited features)
          </Link>
        </div>
      </div>
    </div>
  )
}
