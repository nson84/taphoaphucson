# Build app Windows: FE -> static BE -> jar -> bundle JRE 17 -> Electron
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "be"))) {
  $Root = $PSScriptRoot + "\.."
  $Root = (Resolve-Path $Root).Path
}

Write-Host "==> Root: $Root" -ForegroundColor Cyan

$Fe = Join-Path $Root "fe"
$Be = Join-Path $Root "be"
$Desktop = Join-Path $Root "desktop"
$Static = Join-Path $Be "src\main\resources\static"
$Resources = Join-Path $Desktop "resources"
$JreDir = Join-Path $Resources "jre"

# 1) Build FE
Write-Host "==> Build frontend" -ForegroundColor Cyan
Push-Location $Fe
if (-not (Test-Path "node_modules")) { npm install }
npm run build
if ($LASTEXITCODE -ne 0) { throw "FE build failed" }
Pop-Location

# 2) Copy FE dist -> BE static
Write-Host "==> Copy FE -> be/src/main/resources/static" -ForegroundColor Cyan
if (Test-Path $Static) { Remove-Item -Recurse -Force $Static }
New-Item -ItemType Directory -Path $Static | Out-Null
Copy-Item -Recurse -Force (Join-Path $Fe "dist\*") $Static

# 3) Package Spring Boot jar
Write-Host "==> Maven package jar" -ForegroundColor Cyan
Push-Location $Be
.\mvnw.cmd -q -DskipTests package
if ($LASTEXITCODE -ne 0) { throw "BE package failed" }
Pop-Location

$JarSrc = Get-ChildItem (Join-Path $Be "target") -Filter "debt-*.jar" |
  Where-Object { $_.Name -notlike "*.original" } |
  Select-Object -First 1
if (-not $JarSrc) { throw "Khong tim thay debt-*.jar trong be/target" }

New-Item -ItemType Directory -Force -Path $Resources | Out-Null
Copy-Item -Force $JarSrc.FullName (Join-Path $Resources "debt.jar")
Write-Host "    JAR: $($JarSrc.Name) -> desktop/resources/debt.jar"

# 4) Bundle Eclipse Temurin JRE 17 (portable, no install needed on PC)
$BundledJava = Join-Path $JreDir "bin\java.exe"
if (-not (Test-Path $BundledJava)) {
  Write-Host "==> Download Eclipse Temurin JRE 17 (Windows x64)" -ForegroundColor Cyan
  $Cache = Join-Path $Desktop ".cache"
  New-Item -ItemType Directory -Force -Path $Cache | Out-Null
  $Zip = Join-Path $Cache "temurin17-jre-windows-x64.zip"
  $Url = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk"

  if (-not (Test-Path $Zip)) {
    Write-Host "    Downloading JRE (may take a few minutes)..."
    Invoke-WebRequest -Uri $Url -OutFile $Zip -UseBasicParsing
  } else {
    Write-Host "    Using cached JRE zip"
  }

  $Extract = Join-Path $Cache "jre-extract"
  if (Test-Path $Extract) { Remove-Item -Recurse -Force $Extract }
  New-Item -ItemType Directory -Force -Path $Extract | Out-Null
  Expand-Archive -Path $Zip -DestinationPath $Extract -Force

  $ExtractedJre = Get-ChildItem $Extract -Directory | Select-Object -First 1
  if (-not $ExtractedJre) { throw "Khong giai JRE trong zip Temurin" }
  if (Test-Path $JreDir) { Remove-Item -Recurse -Force $JreDir }
  Move-Item -Force $ExtractedJre.FullName $JreDir

  if (-not (Test-Path $BundledJava)) {
    throw "JRE bundle that bai: thieu bin\java.exe"
  }
  Write-Host "    JRE ready: $BundledJava"
} else {
  Write-Host "==> JRE 17 already bundled" -ForegroundColor Cyan
}

# 5) Electron build
Write-Host "==> Electron build (portable + setup) - Taphoa Phuc Son" -ForegroundColor Cyan
Push-Location $Desktop
if (-not (Test-Path "node_modules")) { npm install }
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist
if ($LASTEXITCODE -ne 0) { throw "Electron build failed" }
Pop-Location

$desk = [Environment]::GetFolderPath("Desktop")
$portable = Join-Path $Desktop "dist\TaphoaPhucSon-Portable.exe"
$setup = Get-ChildItem (Join-Path $Desktop "dist") -Filter "TaphoaPhucSon-*-Setup.exe" -ErrorAction SilentlyContinue |
  Select-Object -First 1
if (Test-Path $portable) {
  Copy-Item -Force $portable (Join-Path $desk "TaphoaPhucSon-Portable.exe")
}
if ($setup) {
  Copy-Item -Force $setup.FullName (Join-Path $desk $setup.Name)
}

Write-Host ""
Write-Host "DONE. App: Taphoa Phuc Son (kem Java 17)" -ForegroundColor Green
Write-Host "  $Desktop\dist"
Write-Host "  Desktop: TaphoaPhucSon-Portable.exe"
Write-Host "Login: admin / admin123"
Write-Host "Data: %APPDATA%\taphoa-phuc-son\data"
Write-Host "Khong can cai Java tren may khach."
