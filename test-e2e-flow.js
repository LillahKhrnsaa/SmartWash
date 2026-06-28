/**
 * END-TO-END FLOW TESTER
 * 
 * Script ini mensimulasikan alur penuh dari awal hingga akhir:
 * 1. User memulai sesi pemandian di Dashboard (POST /api/bathing)
 * 2. Skrip Python AI mendeteksi perintah scan (GET /api/control)
 * 3. Skrip Python AI selesai menscan bulu kucing dan mengirim hasil deteksi (POST /api/control)
 * 4. ESP32 mendeteksi status done dan membaca hasil tipe bulu (GET /api/control)
 * 5. ESP32 mereset status server ke idle (POST /api/control)
 * 6. ESP32 mengirim data telemetri & menyelesaikan proses (POST /api/sensor)
 */

const BASE_URL = "http://localhost:3000";

async function runTest() {
  console.log("🚀 Memulai Pengujian Alur Penuh (End-to-End Flow Testing)\n");

  try {
    // -----------------------------------------------------------------
    // LANGKAH 1: USER START SESI PEMANDIAN DARI WEB DASHBOARD
    // -----------------------------------------------------------------
    console.log("STEP 1: User menekan 'Start Proses Lengkap' di Web Dashboard...");
    const bathingResponse = await fetch(`${BASE_URL}/api/bathing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "1",
        catName: "Garry",
        temperature: 35,
        status: "active"
      })
    });
    
    if (!bathingResponse.ok) {
      throw new Error(`Gagal membuat sesi mandi: ${bathingResponse.statusText}`);
    }
    const bathingData = await bathingResponse.json();
    console.log("✅ Sesi Mandi Berhasil Dibuat:", bathingData);
    console.log("-----------------------------------------------------------------\n");

    // Tunggu sesaat
    await new Promise(r => setTimeout(r, 1000));

    // -----------------------------------------------------------------
    // LANGKAH 2: PYTHON AI MELAKUKAN POLLING DAN MENDETEKSI PERINTAH SCAN
    // -----------------------------------------------------------------
    console.log("STEP 2: Python AI Script melakukan polling GET /api/control...");
    const pythonPollResponse = await fetch(`${BASE_URL}/api/control`);
    if (!pythonPollResponse.ok) {
      throw new Error(`Gagal mengambil data control: ${pythonPollResponse.statusText}`);
    }
    const pythonPollData = await pythonPollResponse.json();
    console.log("✅ Python Menerima Respon API:", pythonPollData);
    
    const commandId = pythonPollData.data.id;
    const currentCommand = pythonPollData.data.command;

    if (currentCommand !== "scan_bulu") {
      throw new Error(`Perintah salah! Diharapkan 'scan_bulu', tetapi mendapatkan: '${currentCommand}'`);
    }
    console.log(`✅ Deteksi Sukses: ID Perintah = ${commandId}, Perintah = '${currentCommand}'`);
    console.log("-----------------------------------------------------------------\n");

    await new Promise(r => setTimeout(r, 1000));

    // -----------------------------------------------------------------
    // LANGKAH 3: PYTHON AI SELESAI SCAN & MENGIRIM DATA TIPE BULU (MISAL: BULU PENDEK = 2)
    // -----------------------------------------------------------------
    console.log("STEP 3: Python AI mengunci tipe bulu kucing (Bulu Pendek = 2) & mengirim hasil...");
    const pythonUpdateResponse = await fetch(`${BASE_URL}/api/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: commandId,
        command: "done",
        tipe_bulu: 2 // 2 = Bulu Pendek (Mode 2)
      })
    });

    if (!pythonUpdateResponse.ok) {
      throw new Error(`Gagal menyimpan hasil scan Python: ${pythonUpdateResponse.statusText}`);
    }
    const pythonUpdateData = await pythonUpdateResponse.json();
    console.log("✅ Respon Server terhadap Hasil Python:", pythonUpdateData);
    console.log("-----------------------------------------------------------------\n");

    await new Promise(r => setTimeout(r, 1000));

    // -----------------------------------------------------------------
    // LANGKAH 4: ESP32 POLLING UNTUK MEMULAI PROSES ALAT
    // -----------------------------------------------------------------
    console.log("STEP 4: ESP32 melakukan polling GET /api/control...");
    const espPollResponse = await fetch(`${BASE_URL}/api/control`);
    if (!espPollResponse.ok) {
      throw new Error(`Gagal polling ESP32: ${espPollResponse.statusText}`);
    }
    const espPollData = await espPollResponse.json();
    console.log("✅ ESP32 Menerima Respon API:", espPollData);

    if (espPollData.data.command !== "done") {
      throw new Error(`Alat belum bisa jalan! Command di server: '${espPollData.data.command}', harusnya 'done'`);
    }
    console.log(`✅ Alat Ter-trigger! Tipe bulu dibaca ESP32: ${espPollData.data.tipe_bulu === 2 ? "Bulu Pendek (Mode 2)" : "Bulu Panjang (Mode 1)"}`);
    console.log(`✅ Durasi Timer Mode 2 (Bulu Pendek) yang digunakan:`, espPollData.timer.mode2);
    console.log("-----------------------------------------------------------------\n");

    await new Promise(r => setTimeout(r, 1000));

    // -----------------------------------------------------------------
    // LANGKAH 5: ESP32 MENETRALISIR PERINTAH (SET TO IDLE)
    // -----------------------------------------------------------------
    console.log("STEP 5: ESP32 mengirim sinyal penetralisir ke POST /api/control...");
    const espIdleResponse = await fetch(`${BASE_URL}/api/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: "idle"
      })
    });

    if (!espIdleResponse.ok) {
      throw new Error(`Gagal menetralisir perintah: ${espIdleResponse.statusText}`);
    }
    const espIdleData = await espIdleResponse.json();
    console.log("✅ Respon Server terhadap Sinyal Idle ESP32:", espIdleData);
    console.log("-----------------------------------------------------------------\n");

    await new Promise(r => setTimeout(r, 1000));

    // -----------------------------------------------------------------
    // LANGKAH 6: ESP32 MENGIRIM STATUS & TELEMETRI AKTUAL HINGGA SELESAI
    // -----------------------------------------------------------------
    console.log("STEP 6: ESP32 mengirim status operasional & telemetri sensor...");
    
    // Kirim telemetri sensor
    const telemetryResponse = await fetch(`${BASE_URL}/api/sensor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suhu_air: 36.8,
        suhu_ruangan: 29.2,
        berat_beban: 3.8
      })
    });
    if (telemetryResponse.ok) {
      console.log("✅ Telemetri Sensor Berhasil Dikirim!");
    }

    // Kirim status operasional berjalan
    const statusRunningResponse = await fetch(`${BASE_URL}/api/sensor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: "DRYING_ON",
        system: "proses_full",
        deteksi_bulu: "Bulu Pendek",
        pompa1: "off",
        pompa2: "off",
        kipas: "on",
        lampu: "on"
      })
    });
    if (statusRunningResponse.ok) {
      console.log("✅ Status Operasional (Running) Berhasil Dikirim!");
    }

    await new Promise(r => setTimeout(r, 1500));

    // Kirim status operasional selesai
    console.log("\nSTEP 7: ESP32 mengirim sinyal bahwa proses pengeringan telah SELESAI...");
    const statusDoneResponse = await fetch(`${BASE_URL}/api/sensor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: "SELESAI",
        system: "selesai",
        deteksi_bulu: "Bulu Pendek",
        pompa1: "off",
        pompa2: "off",
        kipas: "off",
        lampu: "off"
      })
    });

    if (!statusDoneResponse.ok) {
      throw new Error(`Gagal mengirim status selesai: ${statusDoneResponse.statusText}`);
    }
    const statusDoneData = await statusDoneResponse.json();
    console.log("✅ Respon Server terhadap Status Selesai:", statusDoneData);
    console.log("-----------------------------------------------------------------\n");

    // -----------------------------------------------------------------
    // LANGKAH 7: VERIFIKASI SESI SUDAH COMPLETED DI DATABASE
    // -----------------------------------------------------------------
    console.log("STEP 8: Verifikasi status sesi mandi terakhir di database...");
    const verifyResponse = await fetch(`${BASE_URL}/api/bathing?userId=1`);
    if (!verifyResponse.ok) {
      throw new Error(`Gagal memverifikasi sesi mandi: ${verifyResponse.statusText}`);
    }
    const verifyData = await verifyResponse.json();
    const lastSession = verifyData.data[0];
    
    console.log("📊 Sesi Mandi Terakhir di DB:");
    console.log(`   - ID Sesi   : ${lastSession.id}`);
    console.log(`   - Nama Kucing: ${lastSession.catName}`);
    console.log(`   - Status    : ${lastSession.status}`);
    
    if (lastSession.status === "completed") {
      console.log("\n🎉 CONGRATULATIONS! PENGUJIAN E2E FLOW SUKSES 100%!");
    } else {
      console.log("\n❌ Pengujian gagal: Status sesi terakhir masih 'active'");
    }

  } catch (error) {
    console.error("\n❌ TERJADI KESALAHAN SAAT PENGUJIAN:", error.message);
  }
}

runTest();
