"use client"

import { useState, useEffect } from 'react'
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firestore'

// Types for Firestore documents
export interface FirestoreUser {
  id: string
  email: string
  catName: string
  catType: string
  age: number
  ageUnit: 'weeks' | 'months' | 'years'
  weight: number
  createdAt: Timestamp | string
}

export interface FirestoreBathingSession {
  id: string
  userId: string
  catName: string
  startTime: Timestamp | string
  endTime?: Timestamp | string
  temperature: number
  status: 'active' | 'completed'
}

export interface FirestoreDryingSession {
  id: string
  userId: string
  catName: string
  startTime: Timestamp | string
  endTime?: Timestamp | string
  temperature: number
  status: 'active' | 'completed'
}

export interface FirestoreTemperatureLog {
  id: string
  sessionId: string
  sessionType: 'bathing' | 'drying'
  userId: string      // User who made the request
  catName: string     // Cat name from the user
  temperature: number
  timestamp: Timestamp | string
}

// Helper to convert Firestore Timestamp to ISO string
function convertTimestamp(value: Timestamp | string | undefined | null): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Timestamp) {
    return value.toDate().toISOString()
  }
  return value
}

// Hook for realtime users
export function useRealtimeUsers() {
  const [users, setUsers] = useState<FirestoreUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const usersRef = collection(db, COLLECTIONS.USERS)
    const q = query(usersRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData: FirestoreUser[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data().createdAt),
        })) as FirestoreUser[]
        setUsers(usersData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching users:', err)
        setError('Gagal memuat data pengguna')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { users, loading, error }
}

// Hook for realtime bathing sessions
export function useRealtimeBathingSessions() {
  const [sessions, setSessions] = useState<FirestoreBathingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionsRef = collection(db, COLLECTIONS.BATHING_SESSIONS)
    const q = query(sessionsRef, orderBy('startTime', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessionsData: FirestoreBathingSession[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          startTime: convertTimestamp(doc.data().startTime),
          endTime: doc.data().endTime ? convertTimestamp(doc.data().endTime) : undefined,
        })) as FirestoreBathingSession[]
        setSessions(sessionsData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching bathing sessions:', err)
        setError('Gagal memuat sesi pemandian')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const activeSessions = sessions.filter((s) => s.status === 'active')

  return { sessions, activeSessions, loading, error }
}

// Hook for realtime drying sessions
export function useRealtimeDryingSessions() {
  const [sessions, setSessions] = useState<FirestoreDryingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionsRef = collection(db, COLLECTIONS.DRYING_SESSIONS)
    const q = query(sessionsRef, orderBy('startTime', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessionsData: FirestoreDryingSession[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          startTime: convertTimestamp(doc.data().startTime),
          endTime: doc.data().endTime ? convertTimestamp(doc.data().endTime) : undefined,
        })) as FirestoreDryingSession[]
        setSessions(sessionsData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching drying sessions:', err)
        setError('Gagal memuat sesi pengeringan')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const activeSessions = sessions.filter((s) => s.status === 'active')

  return { sessions, activeSessions, loading, error }
}

// Hook for realtime temperature logs
export function useRealtimeTemperatureLogs() {
  const [logs, setLogs] = useState<FirestoreTemperatureLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const logsRef = collection(db, COLLECTIONS.TEMPERATURE_LOGS)
    const q = query(logsRef, orderBy('timestamp', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logsData: FirestoreTemperatureLog[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: convertTimestamp(doc.data().timestamp),
        })) as FirestoreTemperatureLog[]
        setLogs(logsData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching temperature logs:', err)
        setError('Gagal memuat log suhu')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { logs, loading, error }
}

// Combined hook for all admin dashboard data
export function useAdminDashboardData() {
  const { users, loading: usersLoading, error: usersError } = useRealtimeUsers()
  const { 
    sessions: bathingSessions, 
    activeSessions: activeBathingSessions,
    loading: bathingLoading, 
    error: bathingError 
  } = useRealtimeBathingSessions()
  const { 
    sessions: dryingSessions, 
    activeSessions: activeDryingSessions,
    loading: dryingLoading, 
    error: dryingError 
  } = useRealtimeDryingSessions()
  const { logs: rawTemperatureLogs, loading: logsLoading, error: logsError } = useRealtimeTemperatureLogs()

  const loading = usersLoading || bathingLoading || dryingLoading || logsLoading
  const error = usersError || bathingError || dryingError || logsError

  // Create session lookup map for enriching temperature logs with catName
  const sessionMap = new Map<string, string>()
  bathingSessions.forEach((s) => sessionMap.set(s.id, s.catName))
  dryingSessions.forEach((s) => sessionMap.set(s.id, s.catName))

  // Enrich temperature logs with catName from sessions (fallback if not stored directly)
  const temperatureLogs = rawTemperatureLogs.map((log) => ({
    ...log,
    catName: log.catName || sessionMap.get(log.sessionId) || '-',
  }))

  return {
    users,
    bathingSessions,
    dryingSessions,
    activeBathingSessions,
    activeDryingSessions,
    temperatureLogs,
    loading,
    error,
  }
}
