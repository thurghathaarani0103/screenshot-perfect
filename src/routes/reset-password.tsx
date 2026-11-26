import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [{ title: 'Reset Password · Thurgha’s Birthday' }, { name: 'description', content: 'Securely reset your private invitation account password.' }, { property: 'og:title', content: 'Reset Password · Thurgha’s Birthday' }, { property: 'og:description', content: 'Secure account recovery.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: ResetPassword,
})
function ResetPassword() {
  const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState(''); const [ready, setReady] = useState(false); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  useEffect(() => {
    let settled = false
    const unlock = () => { settled = true; setError(''); setReady(true) }
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) unlock()
    })
    const code = new URLSearchParams(window.location.search).get('code')
    const start = code ? supabase.auth.exchangeCodeForSession(code).then(() => undefined) : Promise.resolve()
    void start.finally(() => {
      window.setTimeout(() => {
        void supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) unlock()
          else if (!settled) setError('This reset link has expired or was already used. Go back to sign in and request a new link, then open it in this same browser.')
        })
      }, 1200)
    })
    return () => listener.subscription.unsubscribe()
  }, [])
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); if (password !== confirmation) { setError('The passwords do not match.'); return } setBusy(true)
    const { error: failure } = await supabase.auth.updateUser({ password })
    if (failure) setError(failure.message)
    else setDone(true)
    setBusy(false)
  }
  return <main className="host-page"><div className="auth-panel"><span className="monogram">T.T</span><p className="eyebrow mt-10">A FRESH START</p><h1>{done ? 'Password updated.' : 'A new password.'}</h1>{ready && !done && <form className="auth-form" onSubmit={submit}><label>New password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label><label>Confirm password<input required type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label><Button variant="invitation" disabled={busy}>Save new password</Button></form>}{error && <p role="alert" className="form-error">{error}</p>}{done && <p role="status">Your new password is saved. You are signed in.</p>}<Link to="/host" className="eyebrow">{done ? 'Open your guest list' : 'Return to sign in'}</Link></div></main>
}