import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUpRight, CalendarDays, Clock3, MapPin, Shirt, Volume2, VolumeX, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'
import { RsvpForm } from '@/components/rsvp-form'
import { event, countdown, calendarText, downloadFile } from '@/lib/event'
import { supabase } from '@/integrations/supabase/client'
import music from '@/assets/birthday-music.asset.json'
import { publicPhotos } from '@/lib/photos.functions'

const photoQuery = queryOptions({ queryKey: ['invitation-photos'], queryFn: () => publicPhotos(), staleTime: 30000 })
export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(photoQuery),
  head: () => ({ meta: [
    { title: "Thurgha Thaarani's Birthday Invitation" },
    { name: 'description', content: `You're invited to ${event.title}. ${event.dateLabel}, ${event.time}, ${event.venue}. Dress code: ${event.dressCode}. RSVP with love.` },
    { property: 'og:title', content: "Thurgha Thaarani's Birthday Invitation" },
    { property: 'og:description', content: `An evening to remember. ${event.dateLabel} · ${event.time} · ${event.venue}.` },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
})

function Countdown() {
  const [units, setUnits] = useState<number[]>([0,0,0,0])
  useEffect(() => { setUnits(countdown(Date.now())); const timer = setInterval(() => setUnits(countdown(Date.now())), 1000); return () => clearInterval(timer) }, [])
  return <div className="countdown" aria-label="Time until the celebration">{units.map((unit, i) => <div className="countdown-unit" key={i}><span className="countdown-number">{String(unit).padStart(2,'0')}</span><span className="countdown-label">{['DAYS','HOURS','MINUTES','SECONDS'][i]}</span></div>)}</div>
}

function Index() {
  const { data: photos } = useSuspenseQuery(photoQuery)
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [musicError, setMusicError] = useState('')
  const reduced = useReducedMotion()
  const photo = (slot: string) => photos.find(p => p.slot === slot)?.url
  async function toggleMusic() {
    if (!audio.current) return
    if (playing) { audio.current.pause(); setPlaying(false) }
    else { try { await audio.current.play(); setPlaying(true); setMusicError('') } catch { setMusicError('Music could not play. Please try again.') } }
  }
  return <main className="invite-page">
    <header className="invite-nav"><a href="#" className="monogram" aria-label="Thurgha Thaarani invitation">T<span className="font-light">.</span>T</a><div className="nav-right"><span className="nav-date">01 . 03 . 2027</span><Button variant="ghost" size="icon" className="music-button" title={playing ? 'Mute music' : 'Play music'} aria-label={playing ? 'Mute music' : 'Play music'} aria-pressed={playing} onClick={toggleMusic}>{playing ? <Volume2 /> : <VolumeX />}</Button></div></header>
    <audio ref={audio} src={music.url} loop preload="none" />
    {musicError && <p role="alert" className="form-error">{musicError}</p>}
    <section className="hero">
      <img src={photo('hero') ?? event.backdrop} alt={photo('hero') ? 'Thurgha Thaarani' : 'Crimson satin, roses and a champagne coupe'} className={`hero-image ${photo('hero') ? 'hero-photo' : ''}`} fetchPriority="high" />
      <div className="hero-mask" /><div className="particles" aria-hidden="true">{Array.from({ length: 15 }, (_,i) => <i key={i} />)}</div>
      <motion.div className="hero-content" initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: .15 }}>
        <p className="eyebrow"><span className="eyebrow-line" />YOU’RE CORDIALLY INVITED</p>
        <h1 className="hero-name"><span>Thurgha</span><span>Thaarani</span></h1>
        <p className="hero-subtitle">A birthday celebration</p>
        <p className="hero-description">An evening of love, laughter, and a little magic.<br />Let’s make memories worth keeping.</p>
        <div className="hero-date">{event.dateLabel}<span />{event.time}<span />{event.venue}</div>
        <Button asChild variant="invitation"><a href="#rsvp">Celebrate with me <ArrowUpRight /></a></Button>
      </motion.div>
      <div className="hero-bottom"><a href="#details" className="scroll-indicator"><ArrowDown />SCROLL TO DISCOVER</a><span className="hero-caption">A little red. A little black. A night to remember.</span></div>
    </section>
    <section id="details" className="section event-section">
      <Reveal className="section-heading"><p className="eyebrow">SAVE THE EVENING</p><h2 className="script-heading">You, me & a celebration</h2><p>All the little details for a very special night.</p><div className="ornament-divider" aria-hidden="true"><span /><span className="ornament-star">✧</span><span /></div></Reveal>
      <div className="detail-grid">
        <Reveal className="detail-card"><CalendarDays className="detail-icon" /><p className="eyebrow">THE DATE</p><h3>{event.dateLabel}</h3><p>{event.day}</p></Reveal>
        <Reveal className="detail-card"><Clock3 className="detail-icon" /><p className="eyebrow">THE TIME</p><h3>{event.time}</h3><p>Let the evening begin</p></Reveal>
        <Reveal className="detail-card"><MapPin className="detail-icon" /><p className="eyebrow">THE PLACE</p><h3>{event.venue}</h3><p>{event.location}</p></Reveal>
        <Reveal className="detail-card"><Shirt className="detail-icon" /><p className="eyebrow">THE DRESS CODE</p><h3>{event.dressCode}</h3><p><span className="swatch" /><span className="swatch swatch-black" />Dress to make an entrance</p></Reveal>
      </div>
      <Reveal className="event-actions"><Button asChild variant="refined"><a href={event.maps} target="_blank" rel="noreferrer"><MapPin />Find the venue <ArrowUpRight /></a></Button><Button variant="refined" onClick={() => downloadFile(calendarText(),'thurgha-birthday.ics','text/calendar')}><CalendarDays />Add to calendar</Button></Reveal>
    </section>
    <section className="countdown-band"><Reveal className="section"><div className="section-heading"><p className="eyebrow">THE COUNTDOWN IS ON</p><h2>Until we raise a glass.</h2></div><Countdown /></Reveal></section>
    <section className="section photo-moment"><Reveal className="moment-visual"><motion.img src={photo('moment1') ?? event.backdrop} alt={photo('moment1') ? 'A favourite memory of Thurgha' : 'Red roses and champagne, ready for a celebration'} loading="lazy" />{photo('moment2') && <div className="moment-small"><img src={photo('moment2')} alt="Another favourite memory" loading="lazy" /></div>}</Reveal><Reveal className="quote-copy"><p className="eyebrow">A MOMENT, A MEMORY</p><span className="gold-ornament">✦</span><h2 className="quote-text">“{event.quote}”</h2><p className="quote-description">Another year, another reason to be grateful. For the laughter, the love, and all of you who make life so beautiful.</p><p className="signature">With love, Thurgha</p></Reveal></section>
    {photo('moment3') && <Reveal className="section moment-visual"><img src={photo('moment3')} alt="A special birthday memory" loading="lazy" /></Reveal>}
    <section id="rsvp" className="section rsvp-section"><Reveal className="rsvp-card"><div className="rsvp-card-header"><p className="eyebrow">RÉPONDEZ S’IL VOUS PLAÎT</p><h2 className="script-heading">Kindly Reply</h2><p className="rsvp-deadline">by 15 February 2027</p><div className="ornament-divider" aria-hidden="true"><span /><span className="ornament-star">✧</span><span /></div></div><RsvpForm onSubmit={async data => { const { error } = await supabase.from('rsvps').insert(data); if (error) throw new Error('Your response could not be saved. Please try again.'); }} /></Reveal></section>
    <footer className="invite-footer"><Reveal><span className="gold-ornament">✦</span><h2>Can’t wait to celebrate with you.</h2><p>A night made special by the people in it.</p><Button asChild variant="ghost" className="share-button"><a href={`https://wa.me/?text=${encodeURIComponent(`You're invited to ${event.title}! ${event.dateLabel} at ${event.time}, ${event.venue}. `)}`} onClick={e => { e.preventDefault(); window.open(`https://wa.me/?text=${encodeURIComponent(`You're invited to ${event.title}! ${event.dateLabel} at ${event.time}, ${event.venue}. ${window.location.origin}`)}`, '_blank', 'noopener,noreferrer') }}><Share2 />Share the invitation</a></Button><div className="footer-rule" /><span className="footer-name">THURGHA THAARANI · 2027</span></Reveal><Link to="/host" className="hidden-host">host</Link></footer>
  </main>
}
