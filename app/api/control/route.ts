import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET /api/control - Mengembalikan status kontrol dan timer untuk ESP
export async function GET() {
  try {
    // 1. Ambil data kontrol terbaru
    const controlResult = await query(
      "SELECT id, command, tipe_bulu, fur_type FROM control ORDER BY id DESC LIMIT 1"
    );
    const controlData = controlResult.rows[0] || { command: "idle", tipe_bulu: 0, fur_type: "short" };

    // 2. Ambil data timer untuk Mode 1 dan Mode 2
    const timerResult = await query(
      "SELECT id, mode, pompa1, pompa2, pompa1_fase3, kipas, lampu FROM timer ORDER BY id ASC"
    );
    
    // Default timer jika data kosong
    let mode1 = { pompa1: 5000, pompa2: 5000, pompa1_fase3: 5000, kipas: 15000, lampu: 15000 };
    let mode2 = { pompa1: 8000, pompa2: 8000, pompa1_fase3: 8000, kipas: 20000, lampu: 20000 };

    timerResult.rows.forEach((row) => {
      const formatted = {
        pompa1: row.pompa1,
        pompa2: row.pompa2,
        pompa1_fase3: row.pompa1_fase3,
        kipas: row.kipas,
        lampu: row.lampu,
      };
      if (row.mode === 1 || row.id === 1) {
        mode1 = formatted;
      } else if (row.mode === 2 || row.id === 2) {
        mode2 = formatted;
      }
    });

    // 3. Ambil data mode pengeringan (dry_mode)
    const dryModeResult = await query(
      "SELECT id, kipas, lampu FROM dry_mode ORDER BY id DESC LIMIT 1"
    );
    const dryModeData = dryModeResult.rows[0] 
      ? { kipas: dryModeResult.rows[0].kipas, lampu: dryModeResult.rows[0].lampu }
      : { kipas: 30000, lampu: 30000 };

    return NextResponse.json({
      success: true,
      data: {
        tipe_bulu: controlData.tipe_bulu,
        command: controlData.command,
      },
      timer: {
        mode1,
        mode2,
        jeda: 5000, // Jeda default 5 detik (5000ms)
      },
      dry_mode: dryModeData,
    });
  } catch (error: any) {
    console.error("Control GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data kontrol" },
      { status: 500 }
    );
  }
}

// POST /api/control - Mengupdate status kontrol (misal diset ke 'idle' atau command lain)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, tipe_bulu } = body;

    if (!command) {
      return NextResponse.json(
        { success: false, message: "command wajib diisi" },
        { status: 400 }
      );
    }

    // Cari ID row kontrol terakhir
    const checkResult = await query("SELECT id FROM control ORDER BY id DESC LIMIT 1");
    
    if (checkResult.rows.length > 0) {
      // Update row terakhir
      const lastId = checkResult.rows[0].id;
      if (tipe_bulu !== undefined) {
        await query(
          "UPDATE control SET command = $1, tipe_bulu = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
          [command, tipe_bulu, lastId]
        );
      } else {
        await query(
          "UPDATE control SET command = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [command, lastId]
        );
      }
      console.log(`[Control API] Updated latest control row (ID: ${lastId}) to:`, { command, tipe_bulu });
    } else {
      // Jika kosong, insert row baru
      await query(
        "INSERT INTO control (command, tipe_bulu, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)",
        [command, tipe_bulu || 0]
      );
      console.log(`[Control API] Inserted new control row with command:`, { command, tipe_bulu });
    }

    return NextResponse.json({
      success: true,
      message: "Status control berhasil diperbarui",
    });
  } catch (error: any) {
    console.error("Control POST error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui data kontrol" },
      { status: 500 }
    );
  }
}
