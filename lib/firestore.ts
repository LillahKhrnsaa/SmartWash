import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase/client';

// Collection references
export const COLLECTIONS = {
  ADMINS: 'admins',
  USERS: 'users',
  BATHING_SESSIONS: 'bathingSessions',
  DRYING_SESSIONS: 'dryingSessions',
  TEMPERATURE_LOGS: 'temperatureLogs',
  USER_SESSIONS: 'userSessions', // Combined log for user's bathing & drying sessions
} as const;

// Re-export Firestore db and utilities
export { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
};

// Helper to convert Date to Firestore Timestamp
export function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

// Helper to convert Firestore Timestamp to ISO string
export function fromTimestamp(timestamp: Timestamp | Date | null | undefined): string | null {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return null;
}
