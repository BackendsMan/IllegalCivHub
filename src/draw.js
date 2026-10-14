const rand = (n) => {
  // unbiased: rejection-sample crypto randoms instead of Math.random() * n
  const lim = 2 ** 32 - (2 ** 32 % n)
  const b = new Uint32Array(1)
  do crypto.getRandomValues(b)
  while (b[0] >= lim)
  return b[0] % n
}

export const shuffle = (a) => {
  a = [...a]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Fair but not streaky: the first spin is a plain equal-odds pick. A gun that just dropped gets its odds cut (HIT) and wins
// them back gradually (BACK per spin), so repeats can still happen but 3+ of one gun in 10 spins is ~10%, 4+ is ~0.1%; long-run odds stay equal.
const HIT = 0.1
const BACK = 0.12

export function draw(pool, n) {
  const w = pool.map(() => 1)
  const out = []
  for (let k = 0; k < n; k++) {
    let r = (rand(1e9) / 1e9) * w.reduce((a, b) => a + b)
    let i = 0
    while (i < w.length - 1 && r >= w[i]) r -= w[i++]
    out.push(pool[i])
    for (let j = 0; j < w.length; j++) w[j] += (1 - w[j]) * BACK
    w[i] *= HIT
  }
  return out
}
