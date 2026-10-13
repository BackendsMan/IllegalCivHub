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

// Fair: every spin is an independent, equal-odds pick from the pool, so the same gun can come up again (even back-to-back).
export const draw = (pool, n) => Array.from({ length: n }, () => pool[rand(pool.length)])
