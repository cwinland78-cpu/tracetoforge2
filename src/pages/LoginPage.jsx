import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
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
    setLoading(true)

    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/editor')
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
          setSuccess('Check your email for a confirmation link! If you don\'t see it, check spam or click Resend below.')
          setShowResend(true)
        } else {
          navigate('/editor')
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

          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg mb-4 text-sm">
              {success}
              {showResend && (
                <button
                  onClick={handleResendConfirmation}
                  className="block mt-2 text-orange-400 hover:text-orange-300 underline underline-offset-2 text-xs"
                >
                  Resend confirmation email
                </button>
              )}
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
            to="/editor"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Continue as Guest (limited features)
          </Link>
        </div>
      </div>
    </div>
  )
}
