import { z } from 'zod'
import type { Database } from '@/integrations/supabase/types'

export const rsvpSchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name.').max(150),
  phone: z.string().trim().min(7, 'Please enter a valid phone number.').max(30).regex(/^[+\d\s()\-]+$/, 'Please enter a valid phone number.'),
  email: z.email('Please enter a valid email address.').max(254),
  attending: z.enum(['Yes', 'No', 'Maybe']),
  guests: z.coerce.number().int().min(1).max(50),
  dietary: z.string().max(2000), song: z.string().max(500), message: z.string().max(3000),
})
export type RsvpInput = z.infer<typeof rsvpSchema>
export type Rsvp = Database['public']['Tables']['rsvps']['Row']
export const emptyRsvp: RsvpInput = { full_name: '', phone: '', email: '', attending: 'Yes', guests: 1, dietary: '', song: '', message: '' }
export function summary(rows: Rsvp[]) {
  return { total: rows.length, yes: rows.filter(r => r.attending === 'Yes').length, no: rows.filter(r => r.attending === 'No').length, maybe: rows.filter(r => r.attending === 'Maybe').length, headcount: rows.filter(r => r.attending === 'Yes').reduce((n,r) => n + r.guests, 0) }
}
export function csv(rows: Rsvp[]) {
  const keys = ['full_name','phone','email','attending','guests','dietary','song','message','created_at'] as const
  const safe = (value: unknown) => { let text = String(value ?? ''); if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"', '""') + '"' }
  return '\uFEFF' + [keys.join(','), ...rows.map(row => keys.map(k => safe(row[k])).join(','))].join('\r\n')
}