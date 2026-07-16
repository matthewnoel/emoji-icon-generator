export interface EmojiValidation {
  ok: boolean
  error?: string
  warning?: string
}

const EMOJI_LIKE = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|[️⃣]/u

/**
 * The input must be a single grapheme (so ZWJ sequences, skin tones, and
 * flags count as one emoji). Non-emoji graphemes get a warning, not an error
 * — a letter or digit still renders fine as an icon if that's what you want.
 */
export function validateEmoji(input: string): EmojiValidation {
  if (!input) return { ok: false, error: 'No emoji provided.' }

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  const graphemes = [...segmenter.segment(input)]
  if (graphemes.length > 1) {
    return {
      ok: false,
      error: `Expected a single emoji, got ${graphemes.length} characters: "${input}"`,
    }
  }

  if (!EMOJI_LIKE.test(input)) {
    return {
      ok: true,
      warning: `"${input}" doesn't look like an emoji — generating icons with it anyway.`,
    }
  }
  return { ok: true }
}
