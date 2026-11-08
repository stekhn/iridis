/** FNV-1a 32-bit over a byte array. Used by the golden render tests and the sample script. */
export function fnv1a32(bytes: ArrayLike<number>): number {
  let h = 0x811c9dc5
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]! & 0xff
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

export function hex32(n: number): string {
  return '0x' + (n >>> 0).toString(16).padStart(8, '0')
}
