# Script untuk menjalankan development server
# Menggunakan npm sebagai default karena lebih reliable

Write-Host "Starting development server..." -ForegroundColor Cyan

# Update PATH dari environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Tambahkan Node.js folder ke PATH jika belum ada
$nodePath = "C:\Program Files\nodejs"
if (Test-Path $nodePath) {
    if ($env:Path -notlike "*$nodePath*") {
        $env:Path = "$nodePath;$env:Path"
    }
}

# Gunakan npm langsung (lebih reliable)
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "Menjalankan npm run dev..." -ForegroundColor Green
    npm run dev
} else {
    Write-Host "Error: Node.js/npm tidak ditemukan." -ForegroundColor Red
    Write-Host "Silakan install Node.js dari https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

