/**
 * Session-related types for bathing, drying, and temperature logging
 */

export interface BathingSession {
  id: string;
  userId: string;
  catName: string;
  startTime: string;
  endTime?: string;
  temperature: number;
  status: "active" | "completed";
}

export interface DryingSession {
  id: string;
  userId: string;
  catName: string;
  startTime: string;
  endTime?: string;
  temperature: number;
  status: "active" | "completed";
}

export interface TemperatureLog {
  id: string;
  sessionId: string;
  sessionType: "bathing" | "drying";
  temperature: number;
  timestamp: string;
}
