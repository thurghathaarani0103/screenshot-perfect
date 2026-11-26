import { useEffect, useRef, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const SLOT_META: Record<string, { label: string; aspect: number }> = {
  hero: { label: 'Cover photo', aspect: 16 / 10 },
  moment1: { label: 'Memory 1', aspect: 4 / 3 },
  moment2: { label: 'Memory 2', aspect: 3 / 4 },
  moment3: { label: 'Memory 3', aspect: 16 / 9 },
}

export function clampOffset(offset: { x: number; y: number }, imgW: number, imgH: number, frameW: number, frameH: number, zoom: number) {
  if (!imgW || !imgH || !frameW || !frameH) return { x: 0, y: 0 }
  const baseScale = Math.max(frameW / imgW, frameH / imgH)
  const maxX = Math.max(0, (imgW * baseScale * zoom - frameW) / 2)
  const maxY = Math.max(0, (imgH * baseScale * zoom - frameH) / 2)
  return { x: Math.min(maxX, Math.max(-maxX, offset.x)) + 0, y: Math.min(maxY, Math.max(-maxY, offset.y)) + 0 }
}

export function computeCropRect(imgW: number, imgH: number, frameW: number, frameH: number, zoom: number, offset: { x: number; y: number }) {
  const baseScale = Math.max(frameW / imgW, frameH / imgH)
  const totalScale = baseScale * zoom
  const clamped = clampOffset(offset, imgW, imgH, frameW, frameH, zoom)
  const dispW = imgW * totalScale
  const dispH = imgH * totalScale
  return {
    sx: Math.max(0, (dispW / 2 - frameW / 2 - clamped.x) / totalScale),
    sy: Math.max(0, (dispH / 2 - frameH / 2 - clamped.y) / totalScale),
    sw: Math.min(imgW, frameW / totalScale),
    sh: Math.min(imgH, frameH / totalScale),
  }
}

export function PhotoCropModal({ slot, src, saving, onCancel, onConfirm }: {
  slot: string
  src: string
  saving: boolean
  onCancel: () => void
  onConfirm: (dataUrl: string) => Promise<void>
}) {
  const meta = SLOT_META[slot] ?? { label: 'Photo', aspect: 4 / 3 }
  const stageRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const [frame, setFrame] = useState({ w: 0, h: 0 })
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [cropError, setCropError] = useState('')

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel() }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onCancel, saving])

  const baseScale = natural.w && natural.h && frame.w && frame.h ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1
  const dispW = natural.w * baseScale * zoom
  const dispH = natural.h * baseScale * zoom
  const clamped = clampOffset(offset, natural.w, natural.h, frame.w, frame.h, zoom)
  const imgLeft = (frame.w - dispW) / 2 + clamped.x
  const imgTop = (frame.h - dispH) / 2 + clamped.y

  function handleZoom(nextZoom: number) {
    setZoom(nextZoom)
    setOffset(prev => clampOffset(prev, natural.w, natural.h, frame.w, frame.h, nextZoom))
  }

  async function handleSave() {
    const img = imgRef.current
    if (!img || !natural.w || !natural.h || !frame.w || !frame.h) return
    setCropError('')
    const { sx, sy, sw, sh } = computeCropRect(natural.w, natural.h, frame.w, frame.h, zoom, clamped)
    const outScale = Math.min(1, 1600 / Math.max(sw, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(sw * outScale))
    canvas.height = Math.max(1, Math.round(sh * outScale))
    const ctx = canvas.getContext('2d')
    if (!ctx) { setCropError('Photo could not be prepared.'); return }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    await onConfirm(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div className="modal-backdrop">
      <section className="guest-modal crop-modal" role="dialog" aria-modal="true" aria-label={`Crop ${meta.label}`}>
        <div className="modal-heading">
          <h2>Crop {meta.label}</h2>
          <Button variant="ghost" size="icon" aria-label="Close photo cropper" disabled={saving} onClick={onCancel}><X /></Button>
        </div>
        <p className="crop-hint">Drag the photo to choose which part appears, and slide to zoom.</p>
        <div
          ref={stageRef}
          className="crop-stage"
          style={{ aspectRatio: String(meta.aspect) }}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); dragStart.current = { x: e.clientX, y: e.clientY, ox: clamped.x, oy: clamped.y } }}
          onPointerMove={e => {
            if (!dragStart.current) return
            const next = { x: dragStart.current.ox + (e.clientX - dragStart.current.x), y: dragStart.current.oy + (e.clientY - dragStart.current.y) }
            setOffset(clampOffset(next, natural.w, natural.h, frame.w, frame.h, zoom))
          }}
          onPointerUp={() => { dragStart.current = null }}
          onPointerCancel={() => { dragStart.current = null }}
        >
          <img
            ref={imgRef}
            src={src}
            alt={`${meta.label} crop preview`}
            draggable={false}
            onLoad={e => { setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }); setOffset({ x: 0, y: 0 }); setZoom(1) }}
            style={natural.w ? { width: `${dispW}px`, height: `${dispH}px`, left: `${imgLeft}px`, top: `${imgTop}px` } : { width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div className="crop-grid" aria-hidden="true" />
        </div>
        <div className="crop-controls">
          <label>
            Zoom
            <input type="range" min="1" max="3" step="0.05" value={zoom} aria-label="Zoom photo" onChange={e => handleZoom(Number(e.target.value))} />
            <span>{Math.round(zoom * 100)}%</span>
          </label>
          <Button variant="ghost" size="icon" title="Reset crop" aria-label="Reset crop" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }}><RotateCcw /></Button>
        </div>
        {cropError && <p role="alert" className="form-error">{cropError}</p>}
        <div className="crop-actions">
          <Button variant="refined" disabled={saving} onClick={onCancel}>Cancel</Button>
          <Button variant="invitation" disabled={saving || !natural.w} onClick={() => void handleSave()}>{saving ? 'Saving…' : 'Save photo'}</Button>
        </div>
      </section>
    </div>
  )
}