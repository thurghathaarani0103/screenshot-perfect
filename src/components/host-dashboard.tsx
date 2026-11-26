import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Plus, Pencil, Trash2, X, Upload, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RsvpForm } from '@/components/rsvp-form'
import { PhotoCropModal } from '@/components/photo-crop-modal'
import { supabase } from '@/integrations/supabase/client'
import { summary, csv, type Rsvp, type RsvpInput } from '@/lib/rsvp'
import { event, downloadFile } from '@/lib/event'
import { Reveal } from '@/components/reveal'

async function fetchGuests() {
  const rows: Rsvp[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('rsvps').select('*').order('created_at', { ascending: false }).range(offset, offset + 999)
    if (error) throw new Error('Your guest list could not load. Please try again.')
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

export function HostDashboard({ email, onLogout }: { email: string; onLogout: () => Promise<void> }) {
  const queryClient = useQueryClient()
  const guests = useQuery({ queryKey: ['host-rsvps'], queryFn: fetchGuests })
  const photos = useQuery({ queryKey: ['host-photos'], queryFn: async () => { const { data, error } = await supabase.from('invitation_photos').select('*'); if (error) throw error; return data } })
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('All'); const [sort, setSort] = useState('newest')
  const [editing, setEditing] = useState<Rsvp | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Rsvp | null>(null)
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [uploading, setUploading] = useState('')
  const [cropping, setCropping] = useState<{ slot: string; src: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const targetSlot = useRef('hero')
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { void queryClient.invalidateQueries({ queryKey: ['host-rsvps'] }) }, 250) }
    const channel = supabase.channel(`birthday-rsvps-${Math.random().toString(36).slice(2)}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rsvps' }, refresh).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rsvps' }, refresh).subscribe()
    return () => { if (timer) clearTimeout(timer); void supabase.removeChannel(channel) }
  }, [queryClient])
  useEffect(() => {
    if (!editing && !deleting) return
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setEditing(null); setDeleting(null) } }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [editing, deleting])
  const rows = guests.data ?? []
  const stats = summary(rows)
  const filtered = rows.filter(r => (filter === 'All' || r.attending === filter) && [r.full_name,r.email,r.phone,r.dietary,r.song,r.message].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b) => sort === 'name' ? a.full_name.localeCompare(b.full_name) : sort === 'headcount' ? b.guests-a.guests : b.created_at.localeCompare(a.created_at))
  async function save(input: RsvpInput) {
    if (!editing) return
    const result = editing === 'new' ? await supabase.from('rsvps').insert(input) : await supabase.from('rsvps').update(input).eq('id', editing.id)
    if (result.error) throw new Error('Guest could not be saved. Please try again.')
    setEditing(null); setNotice('Guest saved.'); await queryClient.invalidateQueries({ queryKey: ['host-rsvps'] })
  }
  async function remove() {
    if (!deleting) return
    const { error: failure } = await supabase.from('rsvps').delete().eq('id', deleting.id)
    if (failure) { setError('Guest could not be deleted.'); return }
    setDeleting(null); setNotice('Guest deleted.'); await queryClient.invalidateQueries({ queryKey: ['host-rsvps'] })
  }
  useEffect(() => {
    if (!cropping) return
    return () => URL.revokeObjectURL(cropping.src)
  }, [cropping])
  function pickPhoto(file: File) {
    setError('')
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setError('Choose a JPG, PNG or WebP photo.'); if (fileInput.current) fileInput.current.value = ''; return }
    if (file.size > 10 * 1024 * 1024) { setError('Please choose a photo under 10 MB.'); if (fileInput.current) fileInput.current.value = ''; return }
    setCropping({ slot: targetSlot.current, src: URL.createObjectURL(file) })
    if (fileInput.current) fileInput.current.value = ''
  }
  async function saveCroppedPhoto(url: string) {
    if (!cropping) return
    const slot = cropping.slot; setUploading(slot); setError('')
    try {
      const { error: failure } = await supabase.from('invitation_photos').upsert({ slot, url })
      if (failure) throw new Error('Photo could not be saved.')
      await queryClient.invalidateQueries({ queryKey: ['host-photos'] }); await queryClient.invalidateQueries({ queryKey: ['invitation-photos'] }); setCropping(null); setNotice('Photo added to your invitation.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Photo could not upload.') } finally { setUploading('') }
  }
  return <main className="host-page"><header className="host-header"><div><p className="eyebrow">THURGHA’S CELEBRATION</p><h1>The guest list</h1><p>{email}</p></div><Button variant="refined" onClick={onLogout}><LogOut />Log out</Button></header>
    <div className="host-content"><Reveal className="host-stats">{[['Responses',stats.total],['Attending',stats.yes],['Not attending',stats.no],['Maybe',stats.maybe],['Confirmed headcount',stats.headcount]].map(([label,value]) => <div className="host-stat" key={label}><span className="eyebrow">{label}</span><strong>{value}</strong></div>)}</Reveal>
      <div className="host-toolbar"><input aria-label="Search guests" placeholder="Search guests, songs, dietary needs…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filter attendance" value={filter} onChange={e => setFilter(e.target.value)}><option value="All">All responses</option><option>Yes</option><option>No</option><option>Maybe</option></select><select aria-label="Sort guests" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="headcount">Headcount</option></select><Button variant="refined" onClick={() => downloadFile(csv(filtered),'birthday-guests.csv','text/csv;charset=utf-8')}><Download />Export CSV</Button><Button variant="invitation" onClick={() => setEditing('new')}><Plus />Add guest</Button></div>
      {(error || guests.error) && <p role="alert" className="form-error">{error || guests.error?.message}<Button variant="ghost" onClick={() => { setError(''); void guests.refetch() }}>Retry</Button></p>}{notice && <p role="status" className="eyebrow">{notice}</p>}
      <div className="table-scroll"><table className="guest-table"><thead><tr>{['Guest','Phone','Email','Attendance','Guests','Dietary requirements','Song request','Message','Received','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td>{row.full_name}</td><td>{row.phone}</td><td>{row.email}</td><td><span className={`status-pill status-${row.attending.toLowerCase()}`}>{row.attending}</span></td><td>{row.guests}</td><td>{row.dietary || '—'}</td><td>{row.song || '—'}</td><td>{row.message || '—'}</td><td>{new Date(row.created_at).toLocaleDateString('en-MY', { timeZone: event.timezone })}</td><td><div className="flex gap-1"><Button variant="ghost" size="icon" title={`Edit ${row.full_name}`} aria-label={`Edit ${row.full_name}`} onClick={() => setEditing(row)}><Pencil /></Button><Button variant="ghost" size="icon" title={`Delete ${row.full_name}`} aria-label={`Delete ${row.full_name}`} onClick={() => setDeleting(row)}><Trash2 /></Button></div></td></tr>)}</tbody></table></div>
      {!filtered.length && <p className="empty-guests">{guests.isPending ? 'Opening your guest list…' : rows.length ? 'No guests match your search.' : 'The first memories begin with the first RSVP.'}</p>}
      <div className="host-notes"><section><p className="eyebrow">FOR THE TABLE</p><h2>Dietary requirements</h2><ul>{rows.filter(r => r.dietary && r.attending !== 'No').map(r => <li key={r.id}>{r.dietary}<span>{r.full_name} · {r.attending}</span></li>)}</ul>{!rows.some(r => r.dietary && r.attending !== 'No') && <p className="empty-guests">No dietary requests yet.</p>}</section><section><p className="eyebrow">FOR THE DANCE FLOOR</p><h2>Song requests</h2><ul>{rows.filter(r => r.song).map(r => <li key={r.id}>{r.song}<span>{r.full_name}</span></li>)}</ul>{!rows.some(r => r.song) && <p className="empty-guests">The playlist is waiting for its first request.</p>}</section></div>
      <section className="photo-settings"><p className="eyebrow">YOUR INVITATION, YOUR MEMORIES</p><h2>Invitation photos</h2><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Upload invitation photo" onChange={e => { const file = e.target.files?.[0]; if (file) pickPhoto(file) }} /><div className="photo-slot-grid">{['hero','moment1','moment2','moment3'].map((slot,i) => <div className="photo-slot" key={slot}><img src={photos.data?.find(p => p.slot === slot)?.url ?? event.backdrop} alt={`${i === 0 ? 'Cover' : `Memory ${i}`} preview`} /><p>{i === 0 ? 'Cover photo' : `Memory ${i}`}</p><Button variant="refined" disabled={Boolean(uploading)} onClick={() => { targetSlot.current = slot; fileInput.current?.click() }}><Upload />{uploading === slot ? 'Saving…' : 'Choose photo'}</Button></div>)}</div></section>
    </div>
    {cropping && <PhotoCropModal slot={cropping.slot} src={cropping.src} saving={Boolean(uploading)} onCancel={() => setCropping(null)} onConfirm={saveCroppedPhoto} />}
    {editing && <div className="modal-backdrop"><section className="guest-modal" role="dialog" aria-modal="true" aria-label={editing === 'new' ? 'Add guest' : 'Edit guest'}><div className="modal-heading"><h2>{editing === 'new' ? 'Add a guest' : 'Edit guest'}</h2><Button variant="ghost" size="icon" aria-label="Close guest form" onClick={() => setEditing(null)}><X /></Button></div><RsvpForm privateForm {...(editing === 'new' ? {} : { initial: { ...editing, attending: editing.attending === 'No' || editing.attending === 'Maybe' ? editing.attending : 'Yes' } })} onSubmit={save} /></section></div>}
    {deleting && <div className="modal-backdrop"><section className="guest-modal" role="alertdialog" aria-modal="true" aria-label="Confirm guest deletion"><h2>Remove {deleting.full_name}?</h2><p>This will permanently remove their RSVP.</p><div className="flex gap-3"><Button variant="refined" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={remove}>Delete guest</Button></div></section></div>}
  </main>
}