// ===== BATHING & DRYING SESSIONS CLIENT-SIDE BRIDGE (POSTGRESQL VIA NEXT.JS API) =====

export interface CreateBathingSessionData {
  userId: string;
  catName: string;
  temperature: number;
}

export async function createBathingSessionFirestore(data: CreateBathingSessionData) {
  const response = await fetch("/api/bathing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: data.userId,
      catName: data.catName,
      temperature: data.temperature,
      status: "active",
    }),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || "Gagal membuat sesi pemandian");
  }

  // Update local storage jika ada cached local session list
  try {
    const localSessions = JSON.parse(localStorage.getItem("bathingSessions") || "[]");
    localSessions.push({
      id: result.id,
      userId: data.userId,
      catName: data.catName,
      temperature: data.temperature,
      status: "active",
      startTime: new Date().toISOString(),
    });
    localStorage.setItem("bathingSessions", JSON.stringify(localSessions));
  } catch (e) {
    console.error("Local storage error:", e);
  }

  return result.id;
}

export async function endBathingSessionFirestore(sessionId: string) {
  const response = await fetch("/api/bathing", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: sessionId,
      status: "completed",
      endTime: new Date().toISOString(),
    }),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || "Gagal mengakhiri sesi pemandian");
  }

  // Update local storage cache
  try {
    const localSessions = JSON.parse(localStorage.getItem("bathingSessions") || "[]");
    const updated = localSessions.map((s: any) => 
      s.id === sessionId ? { ...s, status: "completed", endTime: new Date().toISOString() } : s
    );
    localStorage.setItem("bathingSessions", JSON.stringify(updated));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

// ===== DRYING SESSIONS =====

export interface CreateDryingSessionData {
  userId: string;
  catName: string;
  temperature: number;
}

export async function createDryingSessionFirestore(data: CreateDryingSessionData) {
  const response = await fetch("/api/drying", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: data.userId,
      catName: data.catName,
      temperature: data.temperature,
      status: "active",
    }),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || "Gagal membuat sesi pengeringan");
  }

  // Update local storage cache
  try {
    const localSessions = JSON.parse(localStorage.getItem("dryingSessions") || "[]");
    localSessions.push({
      id: result.id,
      userId: data.userId,
      catName: data.catName,
      temperature: data.temperature,
      status: "active",
      startTime: new Date().toISOString(),
    });
    localStorage.setItem("dryingSessions", JSON.stringify(localSessions));
  } catch (e) {
    console.error("Local storage error:", e);
  }

  return result.id;
}

export async function endDryingSessionFirestore(sessionId: string) {
  const response = await fetch("/api/drying", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: sessionId,
      status: "completed",
      endTime: new Date().toISOString(),
    }),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || "Gagal mengakhiri sesi pengeringan");
  }

  // Update local storage cache
  try {
    const localSessions = JSON.parse(localStorage.getItem("dryingSessions") || "[]");
    const updated = localSessions.map((s: any) => 
      s.id === sessionId ? { ...s, status: "completed", endTime: new Date().toISOString() } : s
    );
    localStorage.setItem("dryingSessions", JSON.stringify(updated));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

// ===== TEMPERATURE LOGS =====

export interface AddTemperatureLogData {
  sessionId: string;
  sessionType: "bathing" | "drying";
  userId: string;
  catName: string;
  temperature: number;
}

// Data suhu sudah dicatat otomatis secara real-time oleh ESP ke /api/sensor
// Fungsi ini dipertahankan sebagai no-op untuk kompatibilitas ke fungsi frontend.
export async function addTemperatureLogFirestore(data: AddTemperatureLogData) {
  console.log("[Client Bridge] Temperature log (handled automatically by ESP telemetry):", data);
  return Promise.resolve();
}

// ===== USER SESSIONS (Combined) =====

export async function getUserSessionsFirestore(userId: string) {
  try {
    const [bathingRes, dryingRes] = await Promise.all([
      fetch(`/api/bathing?userId=${encodeURIComponent(userId)}`),
      fetch(`/api/drying?userId=${encodeURIComponent(userId)}`),
    ]);

    const bathingData = await bathingRes.json();
    const dryingData = await dryingRes.json();

    const bathingList = (bathingData.data || []).map((s: any) => ({
      ...s,
      sessionType: "bathing",
    }));

    const dryingList = (dryingData.data || []).map((s: any) => ({
      ...s,
      sessionType: "drying",
    }));

    // Gabungkan dan urutkan berdasarkan waktu mulai terbaru
    const combined = [...bathingList, ...dryingList].sort(
      (a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return combined;
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return [];
  }
}

// ===== ACTIVE SESSIONS =====

export async function getActiveBathingSession(userId: string) {
  try {
    const response = await fetch(`/api/bathing?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();

    if (result.success && result.data) {
      const active = result.data.find((s: any) => s.status === "active");
      return active || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting active bathing session:", error);
    return null;
  }
}

export async function getActiveDryingSession(userId: string) {
  try {
    const response = await fetch(`/api/drying?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();

    if (result.success && result.data) {
      const active = result.data.find((s: any) => s.status === "active");
      return active || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting active drying session:", error);
    return null;
  }
}

// ===== RESET & CLEAR FUNCTIONS =====

export async function resetBathingSessionsFirestore() {
  console.log("[Client Bridge] resetBathingSessions triggered (no-op in local DB mode)");
  return 0;
}

export async function resetDryingSessionsFirestore() {
  console.log("[Client Bridge] resetDryingSessions triggered (no-op in local DB mode)");
  return 0;
}

export async function clearTemperatureLogsFirestore() {
  console.log("[Client Bridge] clearTemperatureLogs triggered (no-op in local DB mode)");
  return 0;
}
