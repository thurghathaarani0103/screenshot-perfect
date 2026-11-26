import backdrop from '@/assets/birthday-backdrop.asset.json'

export const event = {
  name: 'Thurgha Thaarani',
  title: "Thurgha Thaarani's Birthday Celebration",
  date: '2027-03-01T19:30:00+08:00',
  end: '2027-03-01T23:30:00+08:00',
  dateLabel: '1 March 2027',
  day: 'Monday',
  time: '7:30 PM',
  timezone: 'Asia/Kuala_Lumpur',
  venue: 'Oscar Ballroom',
  location: 'Malaysia',
  dressCode: 'Red & Black',
  maps: 'https://www.google.com/maps/search/?api=1&query=Oscar+Ballroom+Malaysia',
  backdrop: backdrop.url,
  quote: 'The best moments in life are the ones we share.',
} as const

export function countdown(now: number) {
  const seconds = Math.max(0, Math.floor((Date.parse(event.date) - now) / 1000))
  return [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
}

export function calendarText() {
  const stamp = (date: string) => new Date(date).toISOString().replace(/[-:]/g, '').replace('.000', '')
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Thurgha Birthday//EN','BEGIN:VEVENT','UID:thurgha-birthday-2027@invitation',`DTSTAMP:${stamp('2026-11-24T00:00:00Z')}`,`DTSTART:${stamp(event.date)}`,`DTEND:${stamp(event.end)}`,`SUMMARY:${event.title}`,`LOCATION:${event.venue}\\, ${event.location}`,`DESCRIPTION:Dress code: ${event.dressCode}`,'END:VEVENT','END:VCALENDAR'].join('\r\n')
}

export function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}