import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, firebaseReady } from '../firebase'
import { adminEmail, findAdmin } from '../admins'
import { BackLink, Icon, LOGO, Notice, Page, ThemeToggle, backgrounds, btnPrimary, card, field, hover } from '../ui'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const name = findAdmin(username)
    if (!name) return setError('Invalid username or password.')
    setBusy(true)
    try {
      // Password is case- and space-insensitive: accounts store it lowercased with no spaces.
      await signInWithEmailAndPassword(auth, adminEmail(name), password.toLowerCase().replace(/\s+/g, ''))
      navigate('/admin')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page bg={backgrounds[3] ?? backgrounds[0]} className="grid place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <BackLink />
          <ThemeToggle />
        </div>
        <form onSubmit={onSubmit} className={`${card} p-7 sm:p-8`}>
          <img src={LOGO} alt="" className="size-16 object-contain" />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Management Login</h1>
          <p className="mt-1 text-sm text-zinc-500">Illegal Civ Management only.</p>

          {!firebaseReady && <div className="mt-5"><Notice>Firebase isn't configured yet. See README.</Notice></div>}

          <label className="mt-6 mb-2 block text-sm font-medium text-zinc-300" htmlFor="user">Username</label>
          <input id="user" className={field} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />

          <label className="mt-4 mb-2 block text-sm font-medium text-zinc-300" htmlFor="pw">Password</label>
          <input id="pw" type="password" className={field} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {error && (
            <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }} className="mt-4 text-sm text-accent">
              {error}
            </motion.p>
          )}

          <motion.button {...hover} type="submit" disabled={busy || !firebaseReady} className={`${btnPrimary} mt-6 w-full`}>
            <Icon name="lock" className="size-4" />
            {busy ? 'Signing in…' : 'Sign in'}
          </motion.button>
        </form>
      </motion.div>
    </Page>
  )
}
