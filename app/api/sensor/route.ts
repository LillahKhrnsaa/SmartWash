import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/sensor - Menangani input telemetry & status dari ESP8266/ESP32
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ==========================================
    // CASE A: UPDATE STATUS OPERASIONAL MESIN
    // ==========================================
    if (body.state !== undefined || body.system !== undefined) {
      const { state, system, deteksi_bulu, pompa1, pompa2, kipas, lampu } = body;

      // Lakukan UPSERT ke table status dengan ID = 1
      await query(
        `INSERT INTO status (id, state, system, deteksi_bulu, pompa1, pompa2, kipas, lampu, updated_at)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           state = EXCLUDED.state,
           system = EXCLUDED.system,
           deteksi_bulu = EXCLUDED.deteksi_bulu,
           pompa1 = EXCLUDED.pompa1,
           pompa2 = EXCLUDED.pompa2,
           kipas = EXCLUDED.kipas,
           lampu = EXCLUDED.lampu,
           updated_at = CURRENT_TIMESTAMP`,
        [state || null, system || null, deteksi_bulu || null, pompa1 || "off", pompa2 || "off", kipas || "off", lampu || "off"]
      );

      // Jika statusnya selesai, kita pastikan update status sesi aktif
      if (system === "selesai" || state === "SELESAI") {
        // Update bathing session aktif menjadi completed
        await query(
          "UPDATE bathing_sessions SET status = 'completed', end_time = CURRENT_TIMESTAMP WHERE status = 'active'"
        );
        // Update drying session aktif menjadi completed
        await query(
          "UPDATE drying_sessions SET status = 'completed', end_time = CURRENT_TIMESTAMP WHERE status = 'active'"
        );
      }

      console.log("[Sensor API] Status updated successfully:", body);

      return NextResponse.json({
        success: true,
        message: "Status mesin berhasil diperbarui",
      });
    }

    // ==========================================
    // CASE B: KIRIM TELEMETRY SENSOR (SUHU & BEBAN)
    // ==========================================
    const { suhu_air, suhu_ruangan, berat_beban } = body;

    if (suhu_air === undefined && suhu_ruangan === undefined && berat_beban === undefined) {
      return NextResponse.json(
        { success: false, message: "Payload tidak dikenali" },
        { status: 400 }
      );
    }

    // Cari user_id dari sesi mandi/kering yang aktif agar log terasosiasi dengan user
    let activeUserId: number | null = null;
    const activeBathing = await query(
      "SELECT user_id FROM bathing_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1"
    );
    if (activeBathing.rows.length > 0) {
      activeUserId = activeBathing.rows[0].user_id;
    } else {
      const activeDrying = await query(
        "SELECT user_id FROM drying_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1"
      );
      if (activeDrying.rows.length > 0) {
        activeUserId = activeDrying.rows[0].user_id;
      }
    }

    // Insert ke tabel monitoring
    await query(
      "INSERT INTO monitoring (suhu_air, suhu_ruangan, berat_beban, user_id, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      [
        suhu_air !== undefined ? parseFloat(suhu_air) : null,
        suhu_ruangan !== undefined ? parseFloat(suhu_ruangan) : null,
        berat_beban !== undefined ? parseFloat(berat_beban) : null,
        activeUserId,
      ]
    );

    console.log("[Sensor API] Telemetry logged:", { suhu_air, suhu_ruangan, berat_beban, user_id: activeUserId });

    return NextResponse.json({
      success: true,
      message: "Telemetry sensor berhasil disimpan",
    });
  } catch (error: any) {
    console.error("Sensor POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memproses data sensor" },
      { status: 500 }
    );
  }
}

// GET /api/sensor - Mengambil data sensor terbaru (berguna untuk testing dan sinkronisasi dashboard)
export async function GET() {
  try {
    // 1. Ambil data monitoring terbaru
    const telemetryResult = await query(
      "SELECT suhu_air, suhu_ruangan, berat_beban, created_at FROM monitoring ORDER BY id DESC LIMIT 1"
    );
    const telemetry = telemetryResult.rows[0] || null;

    // 2. Ambil data status terbaru dengan pengecekan online/offline (aktif jika update < 15 detik)
    const statusResult = await query(
      `SELECT state, system, deteksi_bulu, pompa1, pompa2, kipas, lampu, updated_at,
       (updated_at > CURRENT_TIMESTAMP - INTERVAL '15 seconds') AS is_online 
       FROM status WHERE id = 1`
    );
    const currentStatus = statusResult.rows[0] || null;

    return NextResponse.json({
      success: true,
      telemetry,
      status: currentStatus,
    });
  } catch (error: any) {
    console.error("Sensor GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data sensor" },
      { status: 500 }
    );
  }
}
