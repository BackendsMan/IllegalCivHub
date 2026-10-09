import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'

// undefined while loading, null when signed out, else the Firebase user.
export function useAuth() {
  const [user, setUser] = useState(undefined)
  useEffect(() => {
    if (!auth) return setUser(null)
    return onAuthStateChanged(auth, setUser)
  }, [])
  return user
}
