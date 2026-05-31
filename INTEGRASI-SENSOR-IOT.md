# 🌡️ Panduan Integrasi Sensor IoT ke Website

> Dokumentasi ini menjelaskan cara menghubungkan sensor suhu (Arduino/ESP32/NodeMCU) ke website Cat Grooming Control.

---

## 📋 Ringkasan

Website ini sudah siap menerima data suhu dari sensor IoT secara **real-time**. Sensor akan mengirim data suhu ke API, kemudian website akan menampilkannya otomatis setiap 5 detik.

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────┐      HTTP POST       ┌──────────────────┐
│  Sensor IoT     │  ───────────────────► │   API Server     │
│  (ESP32/Arduino)│                       │   /api/sensor    │
└─────────────────┘                       └──────────────────┘
                                                   │
                                                   │ Simpan ke
                                                   ▼
                                          ┌──────────────────┐
                                          │  Firestore       │
                                          │  Database        │
                                          └──────────────────┘
                                                   │
                                                   │ Polling setiap 5s
                                                   ▼
                                          ┌──────────────────┐
                                          │  Website         │
                                          │  (React Hook)    │
                                          └──────────────────┘
```

---

## 🔌 Endpoint API untuk Sensor

### **POST /api/sensor**

Endpoint ini digunakan oleh sensor IoT untuk mengirim data suhu.

#### URL Lengkap:
```
http://localhost:3000/api/sensor
```

Atau jika sudah deploy:
```
https://your-domain.com/api/sensor
```

#### Request Format:

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "sessionType": "bathing",
  "temperature": 35.5
}
```

#### Parameter:

| Parameter | Type | Required | Deskripsi | Nilai Valid |
|-----------|------|----------|-----------|-------------|
| `sessionType` | string | ✅ Ya | Jenis sesi | `"bathing"` atau `"drying"` |
| `temperature` | number | ✅ Ya | Suhu dalam Celsius | 0 - 100 |

#### Response Success (201):

```json
{
  "success": true,
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Data suhu berhasil disimpan"
}
```

#### Response Error (400):

```json
{
  "success": false,
  "message": "sessionType harus 'bathing' atau 'drying'"
}
```

---

## 🔧 Contoh Kode untuk Sensor

### A. ESP32/ESP8266 (Arduino IDE)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "WIFI_NAME";
const char* password = "WIFI_PASSWORD";

// API endpoint (ganti dengan URL kamu)
const char* serverUrl = "http://192.168.1.100:3000/api/sensor";

// Sensor pin
const int tempSensorPin = 34; // GPIO pin untuk sensor suhu

void setup() {
  Serial.begin(115200);
  
  // Koneksi WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Baca suhu dari sensor (contoh dengan sensor analog)
  float temperature = readTemperature();
  
  // Tentukan session type (bathing atau drying)
  String sessionType = "bathing"; // Ganti sesuai kebutuhan
  
  // Kirim data ke API
  sendToAPI(sessionType, temperature);
  
  // Delay 5 detik (sesuaikan dengan kebutuhan)
  delay(5000);
}

float readTemperature() {
  // Contoh: Baca dari sensor analog (LM35, DHT22, dll)
  int analogValue = analogRead(tempSensorPin);
  
  // Konversi ke Celsius (rumus tergantung sensor yang dipakai)
  // Contoh untuk LM35: voltage * 100
  float voltage = analogValue * (3.3 / 4095.0); // ESP32 = 12-bit ADC
  float temperature = voltage * 100.0;
  
  return temperature;
}

void sendToAPI(String sessionType, float temperature) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Mulai koneksi HTTP
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Buat JSON body
    StaticJsonDocument<200> doc;
    doc["sessionType"] = sessionType;
    doc["temperature"] = temperature;
    
    String jsonBody;
    serializeJson(doc, jsonBody);
    
    // Kirim POST request
    int httpResponseCode = http.POST(jsonBody);
    
    // Cek response
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("HTTP Response code: " + String(httpResponseCode));
      Serial.println("Response: " + response);
    } else {
      Serial.println("Error sending POST: " + String(httpResponseCode));
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}
```

### B. NodeMCU/ESP8266

Sama seperti ESP32, tapi ubah:
```cpp
// ESP8266 menggunakan ESP8266WiFi.h
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

// ADC ESP8266 = 10-bit
float voltage = analogValue * (3.3 / 1023.0);
```

### C. Python (Raspberry Pi / Testing)

```python
import requests
import time
import random

API_URL = "http://localhost:3000/api/sensor"

def read_temperature():
    # Simulasi pembacaan sensor
    # Ganti dengan kode pembacaan sensor asli
    temp = round(random.uniform(30, 40), 1)
    return temp

def send_to_api(session_type, temperature):
    payload = {
        "sessionType": session_type,
        "temperature": temperature
    }
    
    try:
        response = requests.post(API_URL, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

# Main loop
while True:
    temp = read_temperature()
    send_to_api("bathing", temp)
    time.sleep(5)  # Kirim setiap 5 detik
```

---

## 🧪 Testing dengan Postman/cURL

### Menggunakan cURL:

**Untuk sesi bathing:**
```bash
curl -X POST http://localhost:3000/api/sensor \
  -H "Content-Type: application/json" \
  -d '{"sessionType":"bathing","temperature":35.5}'
```

**Untuk sesi drying:**
```bash
curl -X POST http://localhost:3000/api/sensor \
  -H "Content-Type: application/json" \
  -d '{"sessionType":"drying","temperature":28.3}'
```

### Menggunakan Postman:

1. Buka Postman
2. Pilih method: **POST**
3. URL: `http://localhost:3000/api/sensor`
4. Headers:
   - Key: `Content-Type`
   - Value: `application/json`
5. Body → raw → JSON:
   ```json
   {
     "sessionType": "bathing",
     "temperature": 36.5
   }
   ```
6. Klik **Send**

---

## 🔍 Cara Mengecek Data Masuk

### 1. Cek di Terminal Server

Ketika sensor mengirim data, akan muncul log di terminal:
```
[Sensor] bathing: 35.5°C at 2026-02-07T10:15:30.000Z
```

### 2. Cek di Website

- Buka halaman **Bathing** atau **Drying**
- Suhu akan otomatis update setiap 5 detik
- Grafik akan menampilkan history suhu

### 3. Test Endpoint GET

Buka browser atau Postman:
```
http://localhost:3000/api/sensor
```

Response:
```json
{
  "success": true,
  "bathing": {
    "id": "...",
    "sessionType": "bathing",
    "temperature": 35.5,
    "timestamp": {...}
  },
  "drying": {
    "id": "...",
    "sessionType": "drying",
    "temperature": 28.3,
    "timestamp": {...}
  }
}
```

---

## ⚙️ Konfigurasi

### Polling Interval (Website)

Website mengambil data setiap **5 detik** secara default. Untuk mengubahnya, edit file:

**File:** `hooks/use-sensor-data.ts`

```typescript
// Ubah nilai pollingInterval (dalam milidetik)
export function useSensorData(options: UseSensorDataOptions = {}) {
  const { pollingInterval = 5000, enabled = true } = options;
  // 5000 = 5 detik (default)
  // 3000 = 3 detik
  // 10000 = 10 detik
}
```

### Interval Logging (Saat Sesi Aktif)

Data suhu disimpan ke Firestore setiap **10 detik** saat sesi bathing/drying aktif.

**File:** `app/user/bathing/page.tsx` atau `app/user/drying/page.tsx`

```typescript
// Log temperature every 10 seconds
if (elapsed % 10 === 0) {
  addTemperatureLogFirestore({...});
}
```

### Interval Kirim Sensor

Ubah di kode Arduino/ESP32:
```cpp
void loop() {
  // ...
  delay(5000); // 5 detik (recommended)
  // delay(10000); // 10 detik
  // delay(30000); // 30 detik
}
```

**💡 Rekomendasi:**
- Sensor kirim setiap: **5 detik**
- Website polling: **5 detik**
- Logging saat sesi aktif: **10 detik**

---

## 🚨 Troubleshooting

### Problem 1: Sensor tidak bisa kirim data

**Cek:**
1. Apakah WiFi sudah terhubung?
2. Apakah URL API sudah benar?
3. Apakah server website sudah running (`pnpm run dev`)?
4. Cek IP address komputer server

**Cara cek IP address:**
- Windows: `ipconfig` di Command Prompt
- Mac/Linux: `ifconfig` atau `ip addr`

Ganti `localhost` dengan IP address, contoh:
```cpp
const char* serverUrl = "http://192.168.1.100:3000/api/sensor";
```

### Problem 2: Data tidak muncul di website

**Cek:**
1. Buka Console Browser (F12 → Console)
2. Lihat apakah ada error
3. Cek Network tab, apakah request `/api/user/temperature` success
4. Pastikan Firestore Rules sudah di-publish

### Problem 3: Error 400 "sessionType harus bathing atau drying"

Pastikan kirim JSON dengan benar:
```json
{
  "sessionType": "bathing",  // BUKAN "Bathing" atau "bath"
  "temperature": 35.5
}
```

### Problem 4: Error CORS

Jika sensor dari domain berbeda, tambahkan CORS headers (untuk produksi).

---

## 📊 Format Data di Firestore

Data yang dikirim sensor akan disimpan di Firestore collection `temperatureLogs`:

```javascript
{
  id: "uuid-v4",
  sessionId: "sensor-bathing-2026-02-07",
  sessionType: "bathing",  // atau "drying"
  temperature: 35.5,
  timestamp: Timestamp
}
```

---

## 🔐 Keamanan (untuk Production)

Jika website sudah live di internet:

1. **Gunakan HTTPS** (bukan HTTP)
2. **Tambahkan API Key** untuk autentikasi sensor
3. **Rate limiting** untuk mencegah spam
4. **Validasi data** lebih ketat

---

## 📝 Checklist Setup Sensor

- [ ] Sensor suhu sudah terpasang dan berfungsi
- [ ] ESP32/Arduino sudah terkoneksi WiFi
- [ ] Kode Arduino sudah upload dan running
- [ ] Website sudah running (`pnpm run dev`)
- [ ] Test kirim data dengan Postman → Success
- [ ] Data muncul di website
- [ ] Grafik suhu terupdate otomatis

---

**🎉 Selamat! Sensor IoT kamu sudah terhubung dengan website!**

Jika ada pertanyaan, hubungi developer atau baca dokumentasi lengkap di README.md
