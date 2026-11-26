import { useState, type FormEvent } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { emptyRsvp, rsvpSchema, type RsvpInput } from '@/lib/rsvp'

export function RsvpForm({ initial = emptyRsvp, onSubmit, privateForm = false }: { initial?: RsvpInput; onSubmit: (data: RsvpInput) => Promise<void>; privateForm?: boolean }) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const change = (key: keyof RsvpInput, value: string | number) => setValues(v => ({ ...v, [key]: value }))
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('')
    const parsed = rsvpSchema.safeParse(values)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Please check your details.'); return }
    setBusy(true)
    try { await onSubmit(parsed.data); if (!privateForm) setDone(true) } catch (err) { setError(err instanceof Error ? err.message : 'Your response could not be saved. Please try again.') } finally { setBusy(false) }
  }
  if (done) return <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} className="rsvp-success"><div className="success-mark"><Check /></div><p className="eyebrow">RESPONSE RECEIVED</p><h3>{values.attending === 'Yes' ? 'You’re on the guest list.' : 'Thank you for letting me know.'}</h3><p>{values.attending === 'Yes' ? 'A beautiful evening is even better with you in it.' : 'Your response has been saved with love.'}</p><span className="gold-ornament">✦</span></motion.div>
  return <form onSubmit={submit} className="rsvp-form">
    <div className="form-grid">
      <label className="form-wide">Full name<input required maxLength={150} autoComplete="name" value={values.full_name} onChange={e => change('full_name', e.target.value)} placeholder="Your name" /></label>
      <label>Email<input required type="email" autoComplete="email" maxLength={254} value={values.email} onChange={e => change('email', e.target.value)} placeholder="you@example.com" /></label>
      <label>Phone<input required type="tel" maxLength={30} autoComplete="tel" value={values.phone} onChange={e => change('phone', e.target.value)} placeholder="+60 12 345 6789" /></label>
      <fieldset className="form-wide"><legend>Will you attend?</legend><div className="attendance-options">{(['Yes','No','Maybe'] as const).map((status, i) => <label key={status} className={values.attending === status ? 'selected' : ''}><input type="radio" name="attending" value={status} checked={values.attending === status} onChange={() => change('attending', status)} /><span>{['Joyfully accepts','Regretfully declines','Maybe'][i]}</span></label>)}</div></fieldset>
      <label>Number of guests<input type="number" required min={1} max={50} value={values.guests} onChange={e => change('guests', Number(e.target.value))} /><small>Including you and your plus-ones</small></label>
      <label>Dietary requirements<input maxLength={2000} value={values.dietary} onChange={e => change('dietary', e.target.value)} placeholder="Any allergies or preferences?" /></label>
      <label className="form-wide">A song for the dance floor<input maxLength={500} value={values.song} onChange={e => change('song', e.target.value)} placeholder="Song title & artist" /></label>
      <label className="form-wide">A note for Thurgha<textarea maxLength={3000} rows={2} value={values.message} onChange={e => change('message', e.target.value)} placeholder="Wishes, memories, a little love…" /></label>
    </div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="rsvp-submit-wrap"><Button variant="invitation" type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : null}{privateForm ? 'Save guest' : 'Send my reply'}</Button></div>
    {!privateForm && <p className="form-note">Your details stay private. Your presence means everything.</p>}
  </form>
}