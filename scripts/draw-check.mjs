// Self-check for the spin draw: node scripts/draw-check.mjs
import assert from 'node:assert'
import { draw } from '../src/draw.js'

const maxCount = (r) => Math.max(...Object.values(r.reduce((c, g) => ((c[g] = (c[g] || 0) + 1), c), {})))
for (const size of [9, 10, 11]) {
  const pool = Array.from({ length: size }, (_, i) => 'g' + i)
  assert.equal(draw(pool, 7).length, 7)

  // first spin is a plain equal-odds pick
  const first = {}
  for (let i = 0; i < size * 5000; i++) { const g = draw(pool, 1)[0]; first[g] = (first[g] || 0) + 1 }
  for (const g of pool) assert(Math.abs(first[g] - 5000) < 300, `first pick not uniform: ${g} ${first[g]}`)

  // long-run share stays equal
  const long = {}
  for (const g of draw(pool, size * 20000)) long[g] = (long[g] || 0) + 1
  for (const g of pool) assert(Math.abs(long[g] / (size * 200) - 100 / size) < 0.4, `long-run share off: ${g}`)

  // pairs show up at normal random rates; no gun ever appears 4+ times in 20 spins
  const R = 20000
  let pair5 = 0, b2b = 0
  for (let t = 0; t < R; t++) {
    if (maxCount(draw(pool, 5)) >= 2) pair5++
    const r = draw(pool, 20)
    assert(maxCount(r) <= 3, `4+ of one gun in 20 spins: ${r}`)
    if (r.some((g, i) => g === r[i - 1])) b2b++
  }
  const p5 = (100 * pair5) / R
  console.log(`${size} guns: pair-in-5-spins ${p5.toFixed(1)}%, back-to-back in 20 spins ${((100 * b2b) / R).toFixed(1)}%`)
  assert(b2b > 0, 'back-to-back repeats should be possible')
  assert(p5 > 40, 'pairs should be common')
}
console.log('ok')
