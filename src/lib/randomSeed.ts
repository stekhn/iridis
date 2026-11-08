/** A fresh uint32 seed. The only place the app uses real randomness. */
export function randomSeed(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]!
}
