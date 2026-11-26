import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { LockKeyhole, ArrowUpRight, LoaderCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { HostDashboard } from '@/components/host-dashboard'

export const Route = createFileRoute('/host')({
  head: () => ({ meta: [{ title: 'Private Guest List · Thurgha’s Birthday' }, { name: 'description', content: 'Private celebration management for the invitation host.' }, { property: 'og:title', content: 'Private Guest List · Thurgha’s Birthday' }, { property: 'og:description', content: 'Private celebration management.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: Host,
})

function Host() {
  const [mode, setMode] = useState<'login'|'signup'|'forgot'|'magic'>('login')
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [hostEmail, setHostEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true); const [busy, setBusy] = useState(false)
  const [error, setError] = useState(''); const [message, setMessage] = useState('')
  async function check() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: allowed, error: roleError } = await supabase.rpc('is_host')
      if (allowed && !roleError) setHostEmail(user.email ?? 'Host')
      else { setHostEmail(null); setError('This account does not have host access.') }
    } else setHostEmail(null)
    setChecking(false)
  }
  useEffect(() => {
    void check()
    const { data: listener } = supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN') void check() })
    return () => listener.subscription.unsubscribe()
  }, [])
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      if (mode === 'magic') {
        const { error: failure } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/host` } })
        if (failure) throw failure
        setMessage('Check your email and tap the sign-in link. No password needed.')
      } else if (mode === 'forgot') {
        const { error: failure } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
        if (failure) throw failure
        setMessage('Check your email for a password reset link.')
      } else if (mode === 'signup') {
        const { error: failure } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/host` } })
        if (failure) throw failure
        setMessage('Check your email to confirm your account. Only the verified invitation owner can access the guest list.')
      } else {
        const { error: failure } = await supabase.auth.signInWithPassword({ email, password })
        if (failure) throw failure
        await check()
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.') } finally { setBusy(false) }
  }
  if (hostEmail) return <HostDashboard email={hostEmail} onLogout={async () => { const { error: failure } = await supabase.auth.signOut(); if (failure) { setError('Could not log out. Please try again.'); return } setHostEmail(null); setPassword(''); setError('') }} />
  return <main className="host-page"><div className="auth-panel"><Link to="/" className="monogram" aria-label="Back to invitation">T.T</Link><p className="eyebrow mt-10">A PRIVATE LITTLE SPACE</p><h1>{mode === 'magic' ? 'Sign in by email' : mode === 'forgot' ? 'Reset your password' : mode === 'signup' ? 'Welcome, Thurgha.' : 'Welcome back.'}</h1><p>{mode === 'magic' ? 'We will email you a one-tap sign-in link.' : mode === 'forgot' ? 'A fresh start is just an email away.' : 'For the person behind the celebration.'}</p>
    {checking ? <p role="status">Checking your session…</p> : <form className="auth-form" onSubmit={submit}><label>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>{mode !== 'forgot' && mode !== 'magic' && <label>Password<input required minLength={8} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>}{error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status">{message}</p>}<Button variant="invitation" disabled={busy} type="submit">{busy ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}{mode === 'magic' ? 'Email me a sign-in link' : mode === 'forgot' ? 'Send reset link' : mode === 'signup' ? 'Create host account' : 'Sign in'}<ArrowUpRight /></Button></form>}
    <div className="auth-actions"><Button variant="ghost" className="text-button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'First time? Create account' : 'Back to sign in'}</Button>{mode === 'login' && <Button variant="ghost" className="text-button" onClick={() => { setMode('forgot'); setError(''); setMessage('') }}>Forgot password?</Button>}{mode === 'login' && <Button variant="ghost" className="text-button" onClick={() => { setMode('magic'); setError(''); setMessage('') }}>Sign in without password</Button>}</div><Link to="/" className="eyebrow">Back to the invitation</Link></div></main>
}