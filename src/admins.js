// Illegal Civ Management. Keep in sync with the email list in firestore.rules.
export const ADMINS = ['Jayb', 'Chris', 'Aril', 'Seim', 'Blaine', 'Walking', 'BabyJ', 'Nas', 'Johansei', 'Pax', 'Felon']

// Firebase Auth needs an email, so each username maps to a fake internal address.
export const adminEmail = (name) => `${name.toLowerCase()}@tfbhub.local`

// Only this admin can delete reviewed threads. Keep in sync with firestore.rules.
export const CAN_DELETE = 'Nas'

export const findAdmin = (input) => ADMINS.find((n) => n.toLowerCase() === input.trim().toLowerCase())
