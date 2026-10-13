import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion'
import { draw, shuffle } from '../draw'
import { Icon, Page, ThemeToggle, btnGhost, field } from '../ui'

const TIERS = {
  'Tier 1': ['Canik TP9', 'Glock 45', 'Glock 19x', 'Glock G17 Gen5', 'Glock 19', 'Glock 43', 'Glock 23', 'HK45', 'Walther P88', 'Sig P320', 'Olive G17'],
  'Tier 1.5': ['FN 57 1.0', '1911', 'Olive G19x', 'Glock 45', 'Glock 19x', 'Glock G17 Gen5', 'Glock 19', 'Glock 43', 'Glock 23', 'HK45'],
  'Tier 2': ['FN 57 1.0', 'Glock 45', 'Glock 19', 'Olive G19x', 'Glock 43 Mos', 'Glock 45 Mos', 'FN 57 2.0', 'FNX 45', '1911'],
}
// Tier colours match the in-game tile colours (grey / green / blue).
const COLOR = { 'Tier 1': '#aab4c0', 'Tier 1.5': '#62d84e', 'Tier 2': '#3aa0ff' }
const MAX = 100
const GAP = 10

// A gun with no entry here gets a name plate instead of a picture.
const IMG = {
  'Canik TP9': 'canik-tp9', 'Glock 45': 'glock-45', 'Glock 19x': 'glock-19x', 'Glock G17 Gen5': 'glock-17-gen5',
  'Glock 19': 'glock-19', 'Glock 43': 'glock-43', 'HK45': 'hk45', 'Walther P88': 'walther-p88', 'Sig P320': 'sig-p320',
  'Olive G17': 'olive-g17', 'Olive G19x': 'olive-g19x', '1911': '1911', 'Glock 23': 'glock-23',
  'Glock 43 Mos': 'glock-43-mos', 'Glock 45 Mos': 'glock-45-mos', 'FN 57 1.0': 'fn-57-1', 'FN 57 2.0': 'fn-57-2', 'FNX 45': 'fnx-45',
}

// Rarity (the tile colour / star count in the pictures), used to sort the catalog: 1 grey, 2 green, 3 blue, 4 purple.
const STARS = {
  'Canik TP9': 1, 'Walther P88': 1,
  'Glock 19x': 2, 'Glock 19': 2, 'Glock 43': 2, 'Glock 23': 2, 'HK45': 2, 'Sig P320': 2, 'Olive G17': 2, 'Olive G19x': 2,
  'Glock 45': 3, 'Glock G17 Gen5': 3, '1911': 3, 'FN 57 1.0': 3,
  'Glock 43 Mos': 4, 'Glock 45 Mos': 4, 'FN 57 2.0': 4, 'FNX 45': 4,
}

const RC = { 1: '#9aa3ad', 2: '#62d84e', 3: '#3aa0ff', 4: '#b45cf0' }
const RNAME = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Epic' }

const DESC = {
  'Canik TP9': 'Full-size striker-fired pistol with a big magazine and a light, crisp trigger. A solid starter that is easy to keep on target.',
  'Walther P88': 'Old-school double-stack classic with a smooth action. Reliable and steady, but it shows its age next to the newer pieces.',
  'Glock 19x': 'Compact slide on a full-size grip, the best of both worlds. Balanced handling and a dependable all-rounder.',
  'Glock 19': 'The do-everything compact. Easy to carry, easy to shoot, and rarely lets you down.',
  'Glock 43': 'Slim single-stack built for concealment. Light and quick to draw, with a smaller magazine to match.',
  'Glock 23': 'Compact frame chambered for a heavier round. Snappier than a 19 but hits noticeably harder.',
  'HK45': 'Tough, accurate and built like a tank. Heavy slide and a calm recoil impulse make it easy to control.',
  'Sig P320': 'Modular striker-fired pistol with a crisp trigger and strong accuracy. Dependable in any situation.',
  'Olive G17': 'The classic full-size Glock in a low-visibility olive finish. High capacity and steady handling.',
  'Olive G19x': 'Olive-finished crossover Glock with a full grip and compact slide. Quick, balanced and quiet on the eyes.',
  'Glock 45': 'Full-size grip with a compact slide and optic cut. Smooth recoil and quick follow-up shots.',
  'Glock G17 Gen5': 'Latest-generation full-size Glock with improved grip texture and a smooth trigger. Reliable and accurate.',
  '1911': 'The legendary single-stack .45. Heavy-hitting and accurate, with a short magazine and a slower pace.',
  'FN 57 1.0': 'Lightweight, high-capacity pistol with a flat-shooting round and very little recoil. Great at range.',
  'Glock 43 Mos': 'Slim concealed-carry Glock fitted with a red-dot optic plate. Pinpoint aim in a pocket-sized frame.',
  'Glock 45 Mos': 'Optic-ready Glock 45 with a weapon light up front. Fast, accurate and ready for anything.',
  'FN 57 2.0': 'Upgraded FN 57 with a weapon light and tuned internals. Longer effective range and rapid-fire control.',
  'FNX 45': 'Large-frame .45 with serious stopping power and a big magazine. Heavy, but hits hard and stays controllable.',
}

// Illustrative stats only: a rarity baseline plus a small steady per-gun offset.
const hash = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const STAT_BASE = { Damage: [24, 31, 39, 48], Range: [34, 42, 51, 60], 'Fire rate': [66, 73, 81, 89], Control: [58, 64, 72, 80], Magazine: [12, 15, 17, 21] }
function statsFor(name) {
  const r = STARS[name] - 1
  const h = hash(name)
  return Object.entries(STAT_BASE).map(([k, v], i) => [k, v[r] + (((h >> (i * 3)) % 7) - 3) * (k === 'Magazine' ? 0.4 : 1)].map((x) => (typeof x === 'number' ? Math.round(x) : x)))
}

function GunModal({ name, tier, onClose }) {
  const r = STARS[name]
  const rc = RC[r]
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [onClose])
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        role="dialog"
        aria-label={name}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="relative grid max-h-[92dvh] w-full max-w-3xl gap-6 overflow-y-auto rounded-3xl border bg-ink-900 p-5 sm:grid-cols-[260px_1fr] sm:p-7"
        style={{ borderColor: `${rc}77`, boxShadow: `0 0 70px -20px ${rc}` }}
      >
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white">
          <Icon name="x" className="size-4" />
        </button>
        <Gun name={name} className="aspect-square w-full max-w-64 justify-self-center" style={{ boxShadow: `0 0 36px -8px ${rc}` }} />
        <div>
          <p className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: rc }}>{RNAME[r]} · {'★'.repeat(r)}</p>
          <h3 className="mt-1 text-3xl font-black tracking-tight">{name}</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {catalog_tiers(name).map((t) => (
              <span key={t} className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={t === tier ? { background: `${COLOR[t]}26`, color: COLOR[t] } : { background: 'rgb(255 255 255 / 0.05)', color: '#71717a' }}>{t}</span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">{DESC[name]}</p>
          <div className="mt-5 space-y-2.5">
            {statsFor(name).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[84px_1fr_32px] items-center gap-3 text-xs">
                <span className="font-semibold text-zinc-400">{k}</span>
                <span className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${Math.min(100, k === 'Magazine' ? v * 3.6 : v)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="block h-full rounded-full" style={{ background: rc }} />
                </span>
                <span className="text-right font-bold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

const catalog_tiers = (g) => Object.entries(TIERS).filter(([, guns]) => guns.includes(g)).map(([t]) => t)

function Gun({ name, className = '', style }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-ink-800 ${className}`} style={style}>
      {IMG[name] ? (
        <img src={`${import.meta.env.BASE_URL}guns/${IMG[name]}.png`} alt={name} draggable="false" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center p-2 text-center text-xs font-bold text-zinc-400">{name}</div>
      )}
    </div>
  )
}

export default function Spin({ back }) {
  const [tier, setTier] = useState('Tier 1')
  const [count, setCount] = useState('3')
  const [results, setResults] = useState([])
  const [strip, setStrip] = useState(() => shuffle([...TIERS['Tier 1'], ...TIERS['Tier 1'], ...TIERS['Tier 1']]))
  const [win, setWin] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sel, setSel] = useState(null)
  const [cw, setCw] = useState(900)
  const wrap = useRef()
  const x = useMotionValue(0)
  const ctl = useRef()
  const done = useRef()
  const skip = useRef(false)
  const dead = useRef(false)

  useEffect(() => {
    dead.current = false
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width))
    ro.observe(wrap.current)
    return () => {
      dead.current = true
      ro.disconnect()
    }
  }, [])

  const color = COLOR[tier]
  const pool = TIERS[tier]
  const n = Math.min(MAX, Math.max(1, parseInt(count) || 1))
  const tw = Math.max(88, Math.min(150, cw / 5))
  const step = tw + GAP
  const S = Math.ceil(cw / 2 / step) + 2 // start index: keeps tiles on both sides of the marker
  const centerOf = (i) => cw / 2 - (i * step + tw / 2)
  const catalog = Object.entries(TIERS).reduce((m, [t, guns]) => (guns.forEach((g) => (m[g] = [...(m[g] || []), t])), m), {})

  useEffect(() => {
    if (!busy) x.set(centerOf(S))
  }, [cw, busy])

  function pick(t) {
    setTier(t)
    setResults([])
    setWin(-1)
    setStrip(shuffle([...TIERS[t], ...TIERS[t], ...TIERS[t]]))
  }

  // Long strip of guns with the pre-drawn winner at index T; the reel eases out onto it.
  async function roll(target, ms) {
    const L = 72, T = 60
    const s = []
    while (s.length < L) s.push(...shuffle(pool))
    s.length = L
    s[T] = target
    setWin(-1)
    setStrip(s)
    x.set(centerOf(S))
    await new Promise((resolve) => {
      done.current = resolve
      ctl.current = animate(x, centerOf(T) + (Math.random() - 0.5) * tw * 0.6, { duration: ms, ease: [0.08, 0.6, 0.12, 1], onComplete: resolve })
    })
    setWin(T)
  }

  async function spin() {
    const targets = draw(pool, n)
    skip.current = false
    setBusy(true)
    setResults([])
    for (let i = 0; i < n && !dead.current; i++) {
      setProgress(i + 1)
      await roll(targets[i], skip.current ? 0.05 : n <= 3 ? 4.6 : n <= 10 ? 2.2 : 0.9)
      setResults((r) => [...r, targets[i]])
      if (!skip.current) await new Promise((r) => setTimeout(r, n <= 3 ? 900 : 250))
    }
    setBusy(false)
  }

  function skipAnim() {
    skip.current = true
    ctl.current?.complete()
    done.current?.()
  }

  const tally = Object.entries(results.reduce((m, g) => ((m[g] = (m[g] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1])

  return (
    <Page className="px-4 pb-24 sm:px-6">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] transition-[background] duration-700" style={{ background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${color}30, transparent 70%)` }} />

      <div className="mx-auto max-w-5xl" style={{ '--tc': color }}>
        <div className="flex items-center justify-between gap-4 py-5">
          {back ? (
            <a href="#/" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
              <Icon name="back" className="size-4" /> Back to hub
            </a>
          ) : (
            <span className="text-xs font-bold tracking-[0.25em] text-zinc-500 uppercase">Illegal Civ</span>
          )}
          <ThemeToggle />
        </div>

        <header className="mt-6 text-center sm:mt-10">
          <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color }}>Weapon spin</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] font-black tracking-tight uppercase sm:text-6xl">
            Spin for your <span style={{ color }}>piece</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Pick a tier, choose how many spins, and let it roll. Every gun in the tier comes up evenly — no rigged odds.
          </p>
        </header>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {Object.entries(TIERS).map(([t, guns]) => {
            const on = tier === t
            return (
              <button
                key={t}
                disabled={busy}
                onClick={() => pick(t)}
                className="group relative overflow-hidden rounded-2xl border bg-ink-900/70 p-4 text-left transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
                style={{ borderColor: on ? COLOR[t] : 'rgb(255 255 255 / 0.08)', boxShadow: on ? `0 0 32px -10px ${COLOR[t]}` : 'none' }}
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: COLOR[t], opacity: on ? 1 : 0.35 }} />
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold">{t}</span>
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${COLOR[t]}22`, color: COLOR[t] }}>{guns.length} guns</span>
                </div>
                <div className="mt-3 flex gap-2">
                  {guns.slice(0, 5).map((g) => (
                    <Gun key={g} name={g} className="size-11 shrink-0 rounded-lg" />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-900/80 p-4 backdrop-blur-xl sm:p-6">
          <div ref={wrap} className="relative overflow-hidden rounded-2xl bg-ink-950/60 py-5">
            <motion.div style={{ x, gap: GAP }} className="flex will-change-transform">
              {strip.map((g, i) => (
                <Gun
                  key={i}
                  name={g}
                  className="shrink-0 border-2 transition-all duration-500"
                  style={{
                    width: tw,
                    height: tw,
                    borderColor: win === i ? color : 'transparent',
                    boxShadow: win === i ? `0 0 36px -4px ${color}` : 'none',
                    transform: win === i ? 'scale(1.06)' : win >= 0 ? 'scale(0.94)' : 'none',
                    opacity: win >= 0 && win !== i ? 0.45 : 1,
                  }}
                />
              ))}
            </motion.div>
            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-ink-900 to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-1/5 bg-gradient-to-l from-ink-900 to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 opacity-70" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
            <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 size-0 -translate-x-1/2 border-x-[9px] border-t-[11px] border-x-transparent" style={{ borderTopColor: color }} />
            <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 size-0 -translate-x-1/2 border-x-[9px] border-b-[11px] border-x-transparent" style={{ borderBottomColor: color }} />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-1.5">
              <button disabled={busy} onClick={() => setCount(String(Math.max(1, n - 1)))} className={`${btnGhost} size-12 !p-0 text-lg`} aria-label="Fewer spins">−</button>
              <label>
                <span className="sr-only">Number of spins</span>
                <input type="number" min="1" max={MAX} disabled={busy} value={count} onChange={(e) => setCount(e.target.value)} className={`${field} h-12 w-24 [appearance:textfield] text-center text-lg font-bold [&::-webkit-inner-spin-button]:appearance-none`} />
              </label>
              <button disabled={busy} onClick={() => setCount(String(Math.min(MAX, n + 1)))} className={`${btnGhost} size-12 !p-0 text-lg`} aria-label="More spins">+</button>
            </div>
            <div className="flex gap-1.5">
              {[1, 3, 5, 10, 25].map((v) => (
                <button key={v} disabled={busy} onClick={() => setCount(String(v))} className={`${btnGhost} h-12 min-w-11 !px-3`} style={n === v ? { borderColor: color } : undefined}>{v}</button>
              ))}
            </div>
            <button
              onClick={spin}
              disabled={busy}
              className="inline-flex h-12 min-w-52 items-center justify-center gap-2.5 rounded-lg px-8 text-base font-black tracking-wide text-black uppercase transition hover:brightness-110 disabled:opacity-60"
              style={{ background: color, boxShadow: `0 0 30px -6px ${color}` }}
            >
              <Icon name="dice" className={`size-5 ${busy ? 'animate-spin' : ''}`} />
              {busy ? `Spinning ${progress}/${n}` : `Spin ${n}×`}
            </button>
            {busy && <button onClick={skipAnim} className={`${btnGhost} h-12 px-5`}>Skip</button>}
          </div>
        </section>

        {results.length > 0 && (
          <section className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold tracking-[0.25em] text-zinc-400 uppercase">All results</h2>
              {!busy && n > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {tally.map(([g, c]) => (
                    <span key={g} className="rounded-full border border-white/10 bg-ink-900/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">{g} <b style={{ color }}>×{c}</b></span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
              {results.map((g, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-white/[0.08] bg-ink-900/70 p-1.5">
                  <Gun name={g} className="aspect-square" />
                  <div className="mt-1.5 flex items-center justify-between gap-1 px-1 pb-0.5">
                    <span className="truncate text-xs font-bold">{g}</span>
                    <span className="shrink-0 text-[10px] text-zinc-500">#{i + 1}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <section className="relative left-1/2 mt-28 w-[min(1480px,calc(100vw-3rem))] -translate-x-1/2">
          <p className="text-center text-xs font-bold tracking-[0.3em] uppercase" style={{ color }}>Weapon catalog</p>
          <h2 className="mt-2 text-center font-display text-2xl font-extrabold uppercase sm:text-3xl">Can drop in {tier}</h2>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {[...pool].sort((x, y) => STARS[x] - STARS[y]).map((g) => (
              <button type="button" key={g} onClick={() => setSel(g)} className="basis-[calc(50%-0.5rem)] cursor-pointer rounded-2xl text-left border border-white/[0.08] bg-ink-900/70 p-3.5 transition-all hover:-translate-y-1 hover:border-[var(--tc)] sm:basis-[calc(33.333%-0.667rem)] lg:basis-[calc(20%-0.8rem)] xl:basis-[calc(16.666%-0.834rem)]">
                <Gun name={g} className="aspect-square" />
                <div className="mt-4 px-1 pb-1">
                  <div className="text-sm font-bold">{g}</div>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {catalog[g].map((t) => (
                      <span key={t} className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={t === tier ? { background: `${COLOR[t]}26`, color: COLOR[t] } : { background: 'rgb(255 255 255 / 0.05)', color: '#71717a' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    <AnimatePresence>{sel && <GunModal key={sel} name={sel} tier={tier} onClose={() => setSel(null)} />}</AnimatePresence>
    </Page>
  )
}
