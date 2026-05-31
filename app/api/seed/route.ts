import { NextResponse } from "next/server";
import { 
  db, 
  doc, 
  setDoc, 
  toTimestamp,
  COLLECTIONS 
} from "@/lib/firestore";

// Seed dummy data for testing
export async function POST() {
  try {
    const now = new Date();

    // Insert dummy bathing temperature log
    const bathingId = crypto.randomUUID();
    await setDoc(doc(db, COLLECTIONS.TEMPERATURE_LOGS, bathingId), {
      id: bathingId,
      sessionId: "dummy-bathing-session",
      sessionType: "bathing",
      temperature: 35,
      timestamp: toTimestamp(now),
    });

    // Insert dummy drying temperature log
    const dryingId = crypto.randomUUID();
    await setDoc(doc(db, COLLECTIONS.TEMPERATURE_LOGS, dryingId), {
      id: dryingId,
      sessionId: "dummy-drying-session",
      sessionType: "drying",
      temperature: 40,
      timestamp: toTimestamp(now),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Dummy data inserted successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Seed data error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to insert dummy data",
      },
      { status: 500 }
    );
  }
}
