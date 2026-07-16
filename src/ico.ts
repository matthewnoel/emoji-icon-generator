// ICO container with PNG-encoded entries (supported by all modern browsers
// and Windows Vista+). Layout: 6-byte header, one 16-byte directory entry per
// image, then the raw PNG payloads.

const HEADER_SIZE = 6
const DIR_ENTRY_SIZE = 16

export interface IcoEntry {
  size: number
  png: Buffer
}

export function packIco(entries: IcoEntry[]): Buffer {
  if (entries.length === 0) throw new Error('packIco requires at least one image')

  const header = Buffer.alloc(HEADER_SIZE)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)

  const directory = Buffer.alloc(DIR_ENTRY_SIZE * entries.length)
  let offset = HEADER_SIZE + directory.length
  entries.forEach((entry, i) => {
    const base = i * DIR_ENTRY_SIZE
    // Width/height bytes: 0 means 256.
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, base)
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, base + 1)
    directory.writeUInt8(0, base + 2) // color count (not palettized)
    directory.writeUInt8(0, base + 3) // reserved
    directory.writeUInt16LE(1, base + 4) // color planes
    directory.writeUInt16LE(32, base + 6) // bits per pixel
    directory.writeUInt32LE(entry.png.length, base + 8)
    directory.writeUInt32LE(offset, base + 12)
    offset += entry.png.length
  })

  return Buffer.concat([header, directory, ...entries.map((e) => e.png)])
}
