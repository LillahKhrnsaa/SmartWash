import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionType = searchParams.get("sessionType");

    // ===== 1. Ambil data suhu terbaru dari database PostgreSQL =====
    const latestTelemetryResult = await query(
      "SELECT suhu_air, suhu_ruangan, created_at FROM monitoring ORDER BY id DESC LIMIT 1"
    );

    const latestTelemetry = latestTelemetryResult.rows[0] || null;
    const waterTemperature = latestTelemetry ? latestTelemetry.suhu_air : null;
    const roomTemperature = latestTelemetry ? latestTelemetry.suhu_ruangan : null;

    // ===== 2. Ambil riwayat log suhu untuk grafik =====
    let logs: any[] = [];

    // Jika parameter sessionType ada, ambil log riwayat dari tabel monitoring
    if (sessionType) {
      const logsResult = await query(
        "SELECT id, suhu_air, suhu_ruangan, created_at FROM monitoring ORDER BY id DESC LIMIT 50"
      );

      logs = logsResult.rows
        .map((row) => {
          const temp = sessionType === "bathing" ? row.suhu_air : row.suhu_ruangan;
          return {
            id: row.id.toString(),
            temperature: temp !== null ? parseFloat(temp) : null,
            timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          };
        })
        // Filter keluar entri yang tidak memiliki pembacaan suhu valid untuk tipe sesi ini
        .filter((log) => log.temperature !== null);
    }

    return NextResponse.json(
      {
        success: true,
        waterTemperature: waterTemperature !== null ? parseFloat(waterTemperature) : null,
        roomTemperature: roomTemperature !== null ? parseFloat(roomTemperature) : null,
        logs,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Get temperature error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Terjadi kesalahan saat mengambil data suhu",
        waterTemperature: null,
        roomTemperature: null,
        logs: [],
      },
      { status: 500 }
    );
  }
}
