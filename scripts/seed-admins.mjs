// One-time: creates the 8 management accounts in Firebase Auth.
// Usage: npm run seed-admins -- <shared password>
// The password is never stored in the code, only in Firebase Auth.
import { initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut, updateProfile } from 'firebase/auth'
import { ADMINS, adminEmail } from '../src/admins.js'

process.loadEnvFile('.env')
const password = process.argv[2]?.toLowerCase().replace(/\s+/g, '') // login page normalizes the same way
if (!password) {
  console.error('Usage: npm run seed-admins -- <shared password>')
  process.exit(1)
}

const auth = getAuth(
  initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  }),
)

for (const name of ADMINS) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, adminEmail(name), password)
    await updateProfile(user, { displayName: name }) // becomes the "reviewedBy" name
    console.log(`created  ${name}`)
  } catch (e) {
    console.log(`skipped  ${name} (${e.code})`)
  }
  await signOut(auth)
}
process.exit(0)
