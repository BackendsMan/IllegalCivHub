import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Lets the public pages run before .env.local exists.
export const firebaseReady = Boolean(config.apiKey)
const app = firebaseReady ? initializeApp(config) : null
export const auth = app && getAuth(app)
export const db = app && getFirestore(app)
