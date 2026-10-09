import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { SECTIONS } from '../content/roe'
import { LOGO, Page, useTheme } from '../ui'
import './roe.css'

// Layout and behavior ported from the FactionROE site (backendsman.github.io/FactionROE).
const num = (i) => String(i + 1).padStart(2, '0')
const motionOK = () => matchMedia('(prefers-reduced-motion: no-preference)').matches

function jump(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto', block: 'start' })
  // Highlight pulse on whatever was jumped to (re-triggers on repeat clicks)
  if (!el.matches('.doc > section, .sub')) return
  el.classList.remove('flash')
  void el.offsetWidth
  el.classList.add('flash')
  clearTimeout(el._flashT)
  el._flashT = setTimeout(() => el.classList.remove('flash'), 1600)
}

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </svg>
)

function CopyLink({ id, title }) {
  const [msg, setMsg] = useState('')
  const timer = useRef()
  async function copy() {
    const url = `${location.href.split('#')[0]}#/roe?s=${id}`
    try {
      await navigator.clipboard.writeText(url)
      setMsg('Link copied')
    } catch {
      setMsg('Copy failed')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(''), 1600)
  }
  return (
    <div className="copy-wrap">
      <span className={`copied${msg ? ' show' : ''}`} aria-live="polite">{msg || 'Link copied'}</span>
      <button type="button" className="copy" onClick={copy} aria-label={`Copy link to ${title} section`}>
        <LinkIcon />
      </button>
    </div>
  )
}

function TocLinks({ active, onPick }) {
  return SECTIONS.map((s, i) => (
    <li key={s.id}>
      <a
        href={`#/roe?s=${s.id}`}
        data-jump={s.id}
        className={active === i ? 'active' : undefined}
        aria-current={active === i ? 'true' : undefined}
        onClick={onPick}
      >
        <span>{num(i)}</span>
        {s.title}
      </a>
    </li>
  ))
}

export default function Roe() {
  const [theme, toggleTheme] = useTheme()
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const [stuck, setStuck] = useState(false)
  const [params] = useSearchParams()
  const root = useRef(null)
  const bar = useRef(null)
  const progress = useRef(null)
  const toggle = useRef(null)
  const drop = useRef(null)

  // In-page links (contents, dropdown, chips): scroll instead of changing the route hash.
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest('a[data-jump]')
      if (!a) return
      e.preventDefault()
      jump(a.dataset.jump)
    }
    const el = root.current
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [])

  // Shared links: #/roe?s=<id>
  useEffect(() => {
    const id = params.get('s')
    if (id) setTimeout(() => jump(id), 350)
  }, [params])

  // Current section, reading progress, stuck state
  useEffect(() => {
    let ticking = false
    const sections = [...root.current.querySelectorAll('.doc > section[id]')]
    function onScroll() {
      ticking = false
      const line = innerHeight * 0.3
      let idx = 0
      sections.forEach((s, i) => s.getBoundingClientRect().top <= line && (idx = i))
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) idx = sections.length - 1
      setActive(idx)
      setStuck(bar.current.getBoundingClientRect().top <= 0)
      const max = document.documentElement.scrollHeight - innerHeight
      progress.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`
    }
    const onScrollRaf = () => !ticking && ((ticking = true), requestAnimationFrame(onScroll))
    addEventListener('scroll', onScrollRaf, { passive: true })
    addEventListener('resize', onScroll)
    onScroll()
    return () => {
      removeEventListener('scroll', onScrollRaf)
      removeEventListener('resize', onScroll)
    }
  }, [])

  // Dropdown: close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => !drop.current.contains(e.target) && !toggle.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && (setOpen(false), toggle.current.focus())
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Scroll reveal (skipped with reduced motion, so content never depends on it)
  useEffect(() => {
    if (!('IntersectionObserver' in window) || !motionOK()) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && (en.target.classList.add('in'), io.unobserve(en.target))),
      { rootMargin: '0px 0px -6% 0px' },
    )
    root.current.querySelectorAll('.sec-head, .doc p, .sub-head, .rules > li, .callout, .stages .sub, .chips li').forEach((el) => {
      if ((el.closest('.callout') && !el.matches('.callout')) || (el.matches('.sub-head, p') && el.closest('.stages'))) return
      const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0
      el.style.setProperty('--d', `${Math.min(sib, 6) * 0.05}s`)
      el.classList.add('reveal')
      io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  const dark = theme === 'dark'

  return (
    <Page>
      <div className="roe" ref={root}>
        <div className="progress" aria-hidden>
          <span ref={progress} />
        </div>

        <header className="hero">
          <Link to="/" className="back-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            <span className="lbl">Back to hub</span>
          </Link>
          <img className="logo" src={LOGO} width="400" height="400" alt="TFB" draggable="false" />
          <h1>
            TFB - V5
            <br />
            ILLEGAL CIVILIAN ROE
          </h1>
          <button type="button" className="theme-btn" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {dark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
            <span className="lbl">{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </header>

        <nav className="toc-nav" aria-labelledby="contents-title">
          <h2 className="contents-title" id="contents-title">Jump to section</h2>
          <ol className="toc-list">
            <TocLinks />
          </ol>
        </nav>

        <div className={`toc-bar${stuck ? ' stuck' : ''}`} ref={bar}>
          <div className="toc-bar-in">
            <button type="button" className="toc-toggle" ref={toggle} aria-expanded={open} aria-controls="toc-drop" onClick={() => setOpen((o) => !o)}>
              <span className="k">Jump to section</span>
              <span className="toc-current-num">{num(active)}</span>
              <span className="toc-current">{SECTIONS[active].title}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <nav className={`toc-drop${open ? ' open' : ''}`} id="toc-drop" ref={drop} aria-label="Jump to section">
              <ol>
                <TocLinks active={active} onPick={() => setOpen(false)} />
              </ol>
            </nav>
          </div>
        </div>

        <main className="main" id="rules">
          <article className="doc">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`h-${s.id}`}>
                <div className="sec-head">
                  <h2 className="sec" id={`h-${s.id}`}>{s.title}</h2>
                  <CopyLink id={s.id} title={s.title} />
                </div>
                {s.body}
              </section>
            ))}
          </article>
          <footer>
            <a
              href="#/roe"
              onClick={(e) => {
                e.preventDefault()
                scrollTo({ top: 0, behavior: motionOK() ? 'smooth' : 'auto' })
              }}
            >
              Back to top
            </a>
          </footer>
        </main>
      </div>
    </Page>
  )
}
