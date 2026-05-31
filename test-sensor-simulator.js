/**
 * SENSOR SIMULATOR - Test Script
 * 
 * Script ini mensimulasikan sensor IoT yang mengirim data suhu ke API.
 * Gunakan untuk testing sebelum sensor fisik siap.
 * 
 * Cara menjalankan:
 * 1. Pastikan server website sudah running: pnpm run dev
 * 2. Buka terminal baru
 * 3. Jalankan: node test-sensor-simulator.js
 */

const API_URL = "http://localhost:3000/api/sensor";

// Konfigurasi simulator
const CONFIG = {
  // Interval kirim data (milidetik)
  sendInterval: 5000, // 5 detik
  
  // Session type: "bathing" atau "drying"
  sessionType: "bathing",
  
  // Range suhu
  minTemp: 30,
  maxTemp: 40,
  
  // Mode: "random" atau "realistic"
  mode: "realistic"
};

// State untuk mode realistic
let currentTemp = 35.0;
let direction = 1; // 1 = naik, -1 = turun

/**
 * Generate suhu random
 */
function generateRandomTemp() {
  return parseFloat(
    (Math.random() * (CONFIG.maxTemp - CONFIG.minTemp) + CONFIG.minTemp).toFixed(1)
  );
}

/**
 * Generate suhu realistic (naik-turun bertahap)
 */
function generateRealisticTemp() {
  // Perubahan acak kecil (0.1 - 0.5 derajat)
  const change = (Math.random() * 0.4 + 0.1) * direction;
  currentTemp += change;
  
  // Balik arah jika mencapai batas
  if (currentTemp >= CONFIG.maxTemp) {
    direction = -1;
    currentTemp = CONFIG.maxTemp;
  } else if (currentTemp <= CONFIG.minTemp) {
    direction = 1;
    currentTemp = CONFIG.minTemp;
  }
  
  return parseFloat(currentTemp.toFixed(1));
}

/**
 * Kirim data ke API
 */
async function sendTemperature(sessionType, temperature) {
  const timestamp = new Date().toISOString();
  
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionType,
        temperature,
      }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(
        `✅ [${timestamp}] ${sessionType.toUpperCase()}: ${temperature}°C → Berhasil dikirim`
      );
    } else {
      console.log(
        `❌ [${timestamp}] Error: ${result.message}`
      );
    }
  } catch (error) {
    console.log(
      `❌ [${timestamp}] Network error: ${error.message}`
    );
    console.log("   💡 Pastikan server sudah running: pnpm run dev");
  }
}

/**
 * Main loop
 */
async function startSimulator() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║           SENSOR SIMULATOR - Cat Grooming Control         ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("📋 Konfigurasi:");
  console.log(`   Session Type    : ${CONFIG.sessionType}`);
  console.log(`   Mode            : ${CONFIG.mode}`);
  console.log(`   Range Suhu      : ${CONFIG.minTemp}°C - ${CONFIG.maxTemp}°C`);
  console.log(`   Interval Kirim  : ${CONFIG.sendInterval / 1000} detik`);
  console.log(`   API URL         : ${API_URL}`);
  console.log("");
  console.log("🚀 Simulator dimulai...");
  console.log("   Tekan Ctrl+C untuk berhenti");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("");
  
  // Kirim data pertama langsung
  const temp = CONFIG.mode === "random" 
    ? generateRandomTemp() 
    : generateRealisticTemp();
  await sendTemperature(CONFIG.sessionType, temp);
  
  // Loop kirim data sesuai interval
  setInterval(async () => {
    const temperature = CONFIG.mode === "random" 
      ? generateRandomTemp() 
      : generateRealisticTemp();
    
    await sendTemperature(CONFIG.sessionType, temperature);
  }, CONFIG.sendInterval);
}

// Jalankan simulator
startSimulator();
