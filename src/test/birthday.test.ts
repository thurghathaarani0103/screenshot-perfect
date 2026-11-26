import { describe, expect, it } from 'vitest'
import { event, calendarText, countdown } from '@/lib/event'
import { summary, rsvpSchema, csv, type Rsvp } from '@/lib/rsvp'
import { clampOffset, computeCropRect } from '@/components/photo-crop-modal'
describe('Birthday rules', () => {
  it('starts on 1 March 2027 at 7:30 PM Malaysia time', () => { expect(event.date).toBe('2027-03-01T19:30:00+08:00'); expect(calendarText()).toContain('DTSTART:20270301T113000Z') })
  it('uses Oscar Ballroom and the Red & Black dress code', () => { expect(event.venue).toBe('Oscar Ballroom'); expect(event.dressCode).toBe('Red & Black') })
  it('counts down to the exact event and never goes negative', () => { expect(countdown(Date.parse('2027-02-28T19:30:00+08:00'))).toEqual([1,0,0,0]); expect(countdown(Date.parse(event.date)+1000)).toEqual([0,0,0,0]) })
  it('supports Yes, No and Maybe responses', () => { const base = { full_name: 'Test Guest', email: 'test@example.com', phone: '+60123456789', guests: 2, dietary: '', song: '', message: '' }; for (const attending of ['Yes','No','Maybe']) expect(rsvpSchema.safeParse({...base, attending}).success).toBe(true); expect(rsvpSchema.safeParse({...base, attending: 'Unknown'}).success).toBe(false) })
  it('includes plus-ones in confirmed headcount', () => { const base: Rsvp = { id: '1', created_at: '2026-11-24', full_name: 'Guest', phone: '+60123456789', email: 'test@example.com', attending: 'Yes', guests: 3, dietary: '', song: '', message: '' }; expect(summary([base,{...base,id:'2',attending:'No',guests:5},{...base,id:'3',attending:'Maybe',guests:4}])).toEqual({total:3,yes:1,no:1,maybe:1,headcount:3}) })
  it('escapes CSV formulas and quotes', () => { const row: Rsvp = { id: '1', created_at: '2026-11-24', full_name: '=HYPERLINK("bad")', phone: '+60123456789', email: 'test@example.com', attending: 'Yes', guests: 1, dietary: '', song: '', message: '' }; expect(csv([row])).toContain('"\'=HYPERLINK(""bad"")"') })
  it('clamps photo crop pan offsets and maps the cropped region accurately', () => {
    expect(clampOffset({ x: 500, y: -500 }, 1600, 1200, 400, 300, 1)).toEqual({ x: 0, y: 0 })
    const topCrop = computeCropRect(1600, 2000, 400, 250, 1, { x: 0, y: 500 })
    expect(topCrop).toEqual({ sx: 0, sy: 0, sw: 1600, sh: 1000 })
    const bottomCrop = computeCropRect(1600, 2000, 400, 250, 1, { x: 0, y: -500 })
    expect(bottomCrop).toEqual({ sx: 0, sy: 1000, sw: 1600, sh: 1000 })
  })
})