import { Timestamp } from 'firebase/firestore';

// Admin Document
export interface Admin {
  id: string;
  email: string;
  fullName: string;
  password: string; // hashed
  createdAt: Timestamp;
}

// User Document
export interface User {
  id: string;
  email: string;
  catName: string;
  catType: string;
  password: string; // hashed
  age: number;
  ageUnit: 'weeks' | 'months' | 'years';
  weight: number;
  createdAt: Timestamp;
}

// Bathing Session Document
export interface BathingSession {
  id: string;
  userId: string;
  catName: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  temperature: number;
  status: 'active' | 'completed';
}

// Drying Session Document
export interface DryingSession {
  id: string;
  userId: string;
  catName: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  temperature: number;
  status: 'active' | 'completed';
}

// Temperature Log Document (with userId and catName for tracking)
export interface TemperatureLog {
  id: string;
  sessionId: string;
  sessionType: 'bathing' | 'drying';
  userId: string;      // Auto-filled from requesting user
  catName: string;     // Auto-filled from requesting user
  temperature: number;
  timestamp: Timestamp;
}

// User Session Document (combined log for user's bathing & drying history)
export interface UserSession {
  id: string;
  userId: string;
  catName: string;
  sessionType: 'bathing' | 'drying';
  startTime: Timestamp;
  endTime?: Timestamp;
  temperature: number;
  status: 'active' | 'completed';
}

