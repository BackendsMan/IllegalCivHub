import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router'

// Drop new Menyoo shots into assets/MenyooBackgroundPictures and they're picked up automatically.
export const backgrounds = Object.values(
  import.meta.glob('/assets/MenyooBackgroundPictures/*.{png,PNG,jpg,JPG,jpeg,webp}', { eager: true, import: 'default' }),
)

export { default as LOGO } from '/assets/TFBLogo.png'

export const btn =
  'inline-flex items-center justify-center gap-2.5 rounded-lg px-5 py-3 text-sm font-semibold transition-[background-color,border-color,box-shadow] disabled:pointer-events-none disabled:opacity-40'
export const btnPrimary = `${btn} bg-accent text-on-accent shadow-glow hover:bg-accent-soft`
export const btnGhost = `${btn} border border-white/10 bg-ink-900/70 backdrop-blur-md hover:border-accent/60 hover:shadow-glow`
export const field =
  'w-full rounded-lg border border-white/10 bg-ink-900/80 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/20'
export const card = 'rounded-2xl border border-white/[0.07] bg-ink-900/70 backdrop-blur-xl'

export const hover = { whileHover: { scale: 1.04 }, whileTap: { scale: 0.97 } }
export const MotionLink = motion.create(Link)

const ICONS = {
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z M14 3v5h5 M12 17v-6 M9 14l3-3 3 3',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14',
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3',
  back: 'M19 12H5 M11 6l-6 6 6 6',
  chevron: 'M6 9l6 6 6-6',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1 M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12 M18 6L6 18',
  alert: 'M12 9v4 M12 17h.01 M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  sun: 'M12 4V2 M12 22v-2 M4.9 4.9L3.5 3.5 M20.5 20.5l-1.4-1.4 M4 12H2 M22 12h-2 M4.9 19.1l-1.4 1.4 M20.5 3.5l-1.4 1.4 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  down: 'M12 5v14 M6 13l6 6 6-6',
}

export function Icon({ name, className = 'size-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  )
}

// Page wrapper: fade transition + optional blurred Menyoo backdrop.
export function Page({ children, className = '', bg }) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative isolate min-h-dvh ${className}`}
    >
      {bg && (
        <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
          <img src={bg} alt="" className="h-full w-full scale-110 object-cover opacity-35 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-ink-950/85 to-ink-950" />
        </div>
      )}
      {children}
    </motion.main>
  )
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {}
    setTheme(next)
  }
  return [theme, toggle]
}

export function ThemeToggle({ className = '' }) {
  const [theme, toggle] = useTheme()
  return (
    <button onClick={toggle} className={`${btnGhost} px-3.5 py-2 ${className}`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="size-4" />
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  )
}

export function BackLink() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
      <Icon name="back" className="size-4" /> Back to hub
    </Link>
  )
}

// Back link + theme toggle row, then a centered title block.
export function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="mb-10">
      <div className="flex items-center justify-between gap-4">
        <BackLink />
        <ThemeToggle />
      </div>
      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight uppercase sm:text-5xl">{title}</h1>
        {children && <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-zinc-400">{children}</p>}
      </div>
    </header>
  )
}

export function Notice({ children }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-war/30 bg-war/10 px-4 py-3 text-sm text-war">
      <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
