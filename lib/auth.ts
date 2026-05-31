// Authentication and data management using localStorage

// Import types from centralized types folder
import type {
  Admin,
  User,
  Session,
  BathingSession,
  DryingSession,
  TemperatureLog,
} from './types';

// Re-export types for backward compatibility
export type { Admin, User, Session, BathingSession, DryingSession, TemperatureLog };


// Initialize default admin if not exists
export function initializeDefaultAdmin() {
  const admins = getAdmins();
  if (admins.length === 0) {
    const defaultAdmin: Admin = {
      id: "1",
      email: "admin@catgrooming.com",
      fullName: "Administrator",
      password: "admin123",
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("admins", JSON.stringify([defaultAdmin]));
  }
}

// Admin functions
export function getAdmins(): Admin[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("admins");
  return data ? JSON.parse(data) : [];
}

export function registerAdmin(
  email: string,
  fullName: string,
  password: string
): { success: boolean; message: string } {
  const admins = getAdmins();

  if (admins.some((a) => a.email === email)) {
    return { success: false, message: "Email sudah terdaftar" };
  }

  const newAdmin: Admin = {
    id: Date.now().toString(),
    email,
    fullName,
    password,
    createdAt: new Date().toISOString(),
  };

  admins.push(newAdmin);
  localStorage.setItem("admins", JSON.stringify(admins));
  return { success: true, message: "Registrasi berhasil" };
}

export function loginAdmin(
  email: string,
  password: string
): { success: boolean; message: string; admin?: Admin } {
  const admins = getAdmins();
  const admin = admins.find(
    (a) => a.email === email && a.password === password
  );

  if (!admin) {
    return { success: false, message: "Email atau password salah" };
  }

  const session: Session = {
    id: admin.id,
    type: "admin",
    email: admin.email,
  };
  localStorage.setItem("session", JSON.stringify(session));
  return { success: true, message: "Login berhasil", admin };
}

// User functions
export function getUsers(): User[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("users");
  return data ? JSON.parse(data) : [];
}

export function registerUser(
  email: string,
  catName: string,
  catType: string,
  age: number,
  ageUnit: "weeks" | "months" | "years",
  weight: number,
  password: string
): { success: boolean; message: string } {
  const users = getUsers();

  if (users.some((u) => u.catName === catName)) {
    return { success: false, message: "Nama kucing sudah terdaftar" };
  }

  const newUser: User = {
    id: Date.now().toString(),
    email,
    catName,
    catType,
    age,
    ageUnit,
    weight,
    password,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));
  return { success: true, message: "Registrasi berhasil" };
}

export function loginUser(
  catName: string,
  password: string
): { success: boolean; message: string; user?: User } {
  const users = getUsers();
  const user = users.find(
    (u) => u.catName === catName && u.password === password
  );

  if (!user) {
    return { success: false, message: "Nama kucing atau password salah" };
  }

  const session: Session = {
    id: user.id,
    type: "user",
    catName: user.catName,
  };
  localStorage.setItem("session", JSON.stringify(session));
  return { success: true, message: "Login berhasil", user };
}

// Session functions
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("session");
  return data ? JSON.parse(data) : null;
}

export function logout() {
  localStorage.removeItem("session");
}

// Bathing session functions
export function getBathingSessions(): BathingSession[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("bathingSessions");
  return data ? JSON.parse(data) : [];
}

export function createBathingSession(
  userId: string,
  catName: string,
  temperature: number
): BathingSession {
  const sessions = getBathingSessions();
  const newSession: BathingSession = {
    id: Date.now().toString(),
    userId,
    catName,
    startTime: new Date().toISOString(),
    temperature,
    status: "active",
  };
  sessions.push(newSession);
  localStorage.setItem("bathingSessions", JSON.stringify(sessions));
  return newSession;
}

export function endBathingSession(sessionId: string) {
  const sessions = getBathingSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (session) {
    session.endTime = new Date().toISOString();
    session.status = "completed";
    localStorage.setItem("bathingSessions", JSON.stringify(sessions));
  }
}

// Drying session functions
export function getDryingSessions(): DryingSession[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("dryingSessions");
  return data ? JSON.parse(data) : [];
}

export function createDryingSession(
  userId: string,
  catName: string,
  temperature: number
): DryingSession {
  const sessions = getDryingSessions();
  const newSession: DryingSession = {
    id: Date.now().toString(),
    userId,
    catName,
    startTime: new Date().toISOString(),
    temperature,
    status: "active",
  };
  sessions.push(newSession);
  localStorage.setItem("dryingSessions", JSON.stringify(sessions));
  return newSession;
}

export function endDryingSession(sessionId: string) {
  const sessions = getDryingSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (session) {
    session.endTime = new Date().toISOString();
    session.status = "completed";
    localStorage.setItem("dryingSessions", JSON.stringify(sessions));
  }
}

// Temperature log functions
export function getTemperatureLogs(): TemperatureLog[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("temperatureLogs");
  return data ? JSON.parse(data) : [];
}

export function addTemperatureLog(
  sessionId: string,
  sessionType: "bathing" | "drying",
  temperature: number
) {
  const logs = getTemperatureLogs();
  const newLog: TemperatureLog = {
    id: Date.now().toString(),
    sessionId,
    sessionType,
    temperature,
    timestamp: new Date().toISOString(),
  };
  logs.push(newLog);
  localStorage.setItem("temperatureLogs", JSON.stringify(logs));
}
