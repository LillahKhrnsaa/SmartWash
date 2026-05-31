import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/bathing - Simpan data bathing session baru & trigger scan_bulu ke hardware
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId: userIdStr, catName, temperature, status } = body;

    // Validasi input
    if (!userIdStr) {
      return NextResponse.json(
        { success: false, message: "userId wajib diisi" },
        { status: 400 }
      );
    }

    if (!catName || typeof catName !== "string") {
      return NextResponse.json(
        { success: false, message: "catName wajib diisi" },
        { status: 400 }
      );
    }

    if (typeof temperature !== "number" || temperature < 0 || temperature > 100) {
      return NextResponse.json(
        { success: false, message: "temperature harus berupa angka antara 0-100" },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdStr);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: "userId tidak valid" },
        { status: 400 }
      );
    }

    // Insert new bathing session into PostgreSQL
    const endTimeValue = status === "completed" ? new Date() : null;
    
    const insertResult = await query(
      `INSERT INTO bathing_sessions (user_id, cat_name, temperature, status, start_time, end_time)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
       RETURNING id, user_id, cat_name, temperature, status, start_time, end_time`,
      [userId, catName, temperature, status || "active", endTimeValue]
    );

    const newSession = insertResult.rows[0];

    // Trigger AI Scan Bulu di hardware (Raspberry Pi & ESP) dengan mengupdate table control
    const checkControl = await query("SELECT id FROM control ORDER BY id DESC LIMIT 1");
    if (checkControl.rows.length > 0) {
      await query(
        `UPDATE control 
         SET command = 'scan_bulu', tipe_bulu = 0, user_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [userId, checkControl.rows[0].id]
      );
      console.log(`[Bathing API] Triggered scan_bulu on latest control row (ID: ${checkControl.rows[0].id})`);
    } else {
      await query(
        `INSERT INTO control (command, tipe_bulu, user_id, fur_type, updated_at)
         VALUES ('scan_bulu', 0, $1, 'short', CURRENT_TIMESTAMP)`,
        [userId]
      );
      console.log(`[Bathing API] Triggered scan_bulu by inserting new control row`);
    }

    console.log(`[Bathing] New session created in SQL for cat: ${catName}`);

    return NextResponse.json(
      {
        success: true,
        id: newSession.id.toString(),
        message: "Bathing session berhasil disimpan",
        data: {
          id: newSession.id.toString(),
          userId: newSession.user_id.toString(),
          catName: newSession.cat_name,
          startTime: newSession.start_time,
          temperature: newSession.temperature,
          status: newSession.status,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Bathing POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan saat menyimpan data" },
      { status: 500 }
    );
  }
}

// GET /api/bathing - Ambil data bathing sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get("userId");
    const catName = searchParams.get("catName");

    let result;
    if (userIdStr && catName) {
      const userId = parseInt(userIdStr);
      result = await query(
        "SELECT id, user_id, cat_name, temperature, status, start_time, end_time FROM bathing_sessions WHERE user_id = $1 AND cat_name = $2 ORDER BY start_time DESC LIMIT 50",
        [userId, catName]
      );
    } else if (userIdStr) {
      const userId = parseInt(userIdStr);
      result = await query(
        "SELECT id, user_id, cat_name, temperature, status, start_time, end_time FROM bathing_sessions WHERE user_id = $1 ORDER BY start_time DESC LIMIT 50",
        [userId]
      );
    } else if (catName) {
      result = await query(
        "SELECT id, user_id, cat_name, temperature, status, start_time, end_time FROM bathing_sessions WHERE cat_name = $1 ORDER BY start_time DESC LIMIT 50",
        [catName]
      );
    } else {
      result = await query(
        "SELECT id, user_id, cat_name, temperature, status, start_time, end_time FROM bathing_sessions ORDER BY start_time DESC LIMIT 50"
      );
    }

    const sessions = result.rows.map((row) => ({
      id: row.id.toString(),
      userId: row.user_id?.toString() || null,
      catName: row.cat_name,
      temperature: row.temperature,
      status: row.status,
      startTime: row.start_time,
      endTime: row.end_time,
    }));

    return NextResponse.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error: any) {
    console.error("Bathing GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// PUT /api/bathing - Update status session (complete session)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id: sessionIdStr, status, endTime } = body;

    if (!sessionIdStr) {
      return NextResponse.json(
        { success: false, message: "id session wajib diisi" },
        { status: 400 }
      );
    }

    if (!status || !["active", "completed"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "status harus 'active' atau 'completed'" },
        { status: 400 }
      );
    }

    const sessionId = parseInt(sessionIdStr);
    if (isNaN(sessionId)) {
      return NextResponse.json(
        { success: false, message: "id session tidak valid" },
        { status: 400 }
      );
    }

    const endTimeValue = status === "completed" ? (endTime ? new Date(endTime) : new Date()) : null;

    await query(
      "UPDATE bathing_sessions SET status = $1, end_time = $2 WHERE id = $3",
      [status, endTimeValue, sessionId]
    );

    return NextResponse.json({
      success: true,
      message: "Bathing session berhasil diupdate",
    });
  } catch (error: any) {
    console.error("Bathing PUT error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan saat update" },
      { status: 500 }
    );
  }
}
