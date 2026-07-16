import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas'

// Family list reaches the platform color-emoji font on macOS, Windows, and
// Linux; Skia's system fallback covers anything else.
const EMOJI_FONT_STACK =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif'

export interface RenderOptions {
  /** Fraction of the canvas the emoji glyph should span (0–1). */
  scale: number
  /** CSS color for the background; omit for transparent. */
  background?: string
}

function drawEmoji(ctx: SKRSContext2D, emoji: string, size: number, scale: number): void {
  const fontSize = Math.round(size * scale)
  ctx.font = `${fontSize}px ${EMOJI_FONT_STACK}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Center on the glyph's actual ink bounds — emoji glyphs often sit
  // asymmetrically around the em box, so baseline math alone drifts.
  const m = ctx.measureText(emoji)
  const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
  const y =
    inkHeight > 0
      ? (size - inkHeight) / 2 + m.actualBoundingBoxAscent
      : size / 2 + fontSize * 0.35
  ctx.fillText(emoji, size / 2, y)
}

/** Rasterize the emoji onto a size×size PNG using the system emoji font. */
export function renderEmojiPng(emoji: string, size: number, options: RenderOptions): Buffer {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  if (options.background) {
    ctx.fillStyle = options.background
    ctx.fillRect(0, 0, size, size)
  }
  drawEmoji(ctx, emoji, size, options.scale)
  return canvas.toBuffer('image/png')
}
