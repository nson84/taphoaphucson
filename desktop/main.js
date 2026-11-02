const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const net = require('net')
const { spawn } = require('child_process')
const http = require('http')
const { pathToFileURL } = require('url')

// Cổng riêng — tránh đụng Spring Boot dev trên 8080 (gây màn hình trắng)
const SERVER_PORT = process.env.TAPHOA_PORT || '17890'
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`
// Dev: set TAPHOA_FE_URL=http://localhost:5173 để mở Vite + in im (không cần build jar)
const FE_URL = process.env.TAPHOA_FE_URL || ''
const SKIP_BACKEND = Boolean(FE_URL) || process.env.TAPHOA_SKIP_BACKEND === '1'

let mainWindow = null
let javaProcess = null
let shuttingDown = false
let allowCloseOnce = false
/** true sau khi UI app (không còn splash) đã load thành công */
let appUiReady = false

function backupConfigPath() {
  return path.join(app.getPath('userData'), 'backup-folder.json')
}

/** Thư mục sao lưu mặc định khi chưa chọn thư mục khác (tự tạo nếu chưa có). */
const DEFAULT_BACKUP_DIR = 'D:\\backup_data_banhang_taphoaphucson'

function readBackupFolder() {
  try {
    const raw = fs.readFileSync(backupConfigPath(), 'utf8')
    const data = JSON.parse(raw)
    const dir = typeof data.directory === 'string' ? data.directory.trim() : ''
    return dir || DEFAULT_BACKUP_DIR
  } catch {
    return DEFAULT_BACKUP_DIR
  }
}

function writeBackupFolder(directory) {
  const dir = String(directory || '').trim()
  fs.writeFileSync(backupConfigPath(), JSON.stringify({ directory: dir }, null, 2), 'utf8')
  return dir
}

/**
 * Secret ký JWT riêng từng máy: sinh ngẫu nhiên lần chạy đầu, lưu trong userData.
 * Không dùng secret mặc định trong application.properties (công khai trong repo → ai cũng giả được token).
 */
function jwtSecretFilePath() {
  return path.join(app.getPath('userData'), 'jwt-secret.txt')
}

function loadOrCreateJwtSecret() {
  const file = jwtSecretFilePath()
  try {
    const existing = fs.readFileSync(file, 'utf8').trim()
    if (existing.length >= 32) return existing
  } catch {
    // chưa có file → tạo mới
  }
  const secret = crypto.randomBytes(48).toString('hex')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, secret, { encoding: 'utf8', mode: 0o600 })
  return secret
}

function resourcesDir() {
  if (app.isPackaged) {
    return process.resourcesPath
  }
  return path.join(__dirname, 'resources')
}

function jarPath() {
  return path.join(resourcesDir(), 'debt.jar')
}

function dataDir() {
  const dir = path.join(app.getPath('userData'), 'data')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function findJava() {
  // 1) JRE đóng gói sẵn trong app (không cần cài Java trên máy)
  const bundled = path.join(resourcesDir(), 'jre', 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  if (fs.existsSync(bundled)) {
    return bundled
  }

  // 2) JAVA_HOME / PATH (máy đã cài sẵn)
  const javaHome = process.env.JAVA_HOME
  if (javaHome) {
    const win = path.join(javaHome, 'bin', 'java.exe')
    const unix = path.join(javaHome, 'bin', 'java')
    if (fs.existsSync(win)) return win
    if (fs.existsSync(unix)) return unix
  }
  return process.platform === 'win32' ? 'java.exe' : 'java'
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8'),
        })
      })
    })
    req.on('error', reject)
    req.setTimeout(3000, () => {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

function isAppHtml(body) {
  if (!body) return false
  return body.includes('id="root"') || body.includes('/assets/index-')
}

async function waitForServer(timeoutMs = 120000) {
  const started = Date.now()
  while (!shuttingDown) {
    try {
      const { status, body } = await fetchText(`${SERVER_URL}/`)
      if (status >= 200 && status < 500 && isAppHtml(body)) {
        return
      }
    } catch {
      // keep waiting
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(
        'Máy chủ khởi động quá lâu hoặc không phục vụ giao diện.\n' +
          'Đóng hết cửa sổ app cũ rồi mở lại TaphoaPhucSon-Portable.exe.',
      )
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('Đã thoát ứng dụng')
}

function startBackend() {
  const jar = jarPath()
  if (!fs.existsSync(jar)) {
    throw new Error(`Không tìm thấy debt.jar tại:\n${jar}\nHãy chạy lại script build desktop.`)
  }

  const java = findJava()
  const env = {
    ...process.env,
    TAPHOA_DATA_DIR: dataDir().replace(/\\/g, '/'),
    JWT_SECRET: loadOrCreateJwtSecret(),
  }

  const logFile = path.join(app.getPath('userData'), 'backend.log')
  const logStream = fs.createWriteStream(logFile, { flags: 'a' })
  logStream.write(`\n==== ${new Date().toISOString()} port=${SERVER_PORT} ====\n`)

  // Chuẩn production desktop: MySQL tap_hoa (cần MySQL trên máy). Không dùng profile local/H2.
  javaProcess = spawn(
    java,
    [
      '-jar',
      jar,
      `--server.port=${SERVER_PORT}`,
      // Chỉ nhận kết nối từ chính máy này — không mở API ra mạng LAN
      '--server.address=127.0.0.1',
      '--spring.profiles.active=mysql',
    ],
    {
      env,
      cwd: path.dirname(jar),
      windowsHide: true,
    },
  )

  javaProcess.stdout.on('data', (buf) => {
    logStream.write(buf)
  })
  javaProcess.stderr.on('data', (buf) => {
    logStream.write(buf)
  })
  javaProcess.on('exit', (code) => {
    logStream.write(`\n[exit code ${code}]\n`)
    try {
      logStream.end()
    } catch {
      // ignore
    }
    javaProcess = null
    if (!shuttingDown && code && code !== 0) {
      dialog.showErrorBox(
        'Lỗi máy chủ',
        `Backend đã dừng (mã ${code}).\nXem log: ${logFile}`,
      )
      app.quit()
    }
  })
}

function stopBackend() {
  if (!javaProcess) return
  const proc = javaProcess
  javaProcess = null
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { windowsHide: true })
    } else {
      proc.kill('SIGTERM')
    }
  } catch {
    // ignore
  }
}

function splashLoadingPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'splash', 'loading.html')
  }
  return path.join(__dirname, 'resources', 'splash', 'loading.html')
}

function soundsDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'sounds')
  }
  return path.join(__dirname, 'resources', 'sounds')
}

function soundPlayerPath() {
  return path.join(soundsDir(), 'player.html')
}

/** Ưu tiên .mp3, fallback .wav */
function resolveSoundFile(baseName) {
  const dir = soundsDir()
  const mp3 = path.join(dir, `${baseName}.mp3`)
  if (fs.existsSync(mp3)) return mp3
  const wav = path.join(dir, `${baseName}.wav`)
  if (fs.existsSync(wav)) return wav
  return null
}

/**
 * Phát file âm thanh local trong cửa sổ ẩn (file://), đợi hết hoặc timeout.
 * @returns {Promise<boolean>}
 */
function playLocalSound(filePath, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!filePath || !fs.existsSync(filePath)) {
      resolve(false)
      return
    }
    const player = soundPlayerPath()
    if (!fs.existsSync(player)) {
      resolve(false)
      return
    }

    let settled = false
    let win = null
    const finish = (ok) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        if (win && !win.isDestroyed()) win.destroy()
      } catch {
        // ignore
      }
      resolve(ok)
    }
    const timer = setTimeout(() => finish(true), timeoutMs)

    try {
      win = new BrowserWindow({
        show: false,
        width: 1,
        height: 1,
        skipTaskbar: true,
        webPreferences: {
          autoplayPolicy: 'no-user-gesture-required',
          backgroundThrottling: false,
          contextIsolation: true,
          nodeIntegration: false,
        },
      })
      win.on('closed', () => finish(true))
      win
        .loadFile(player, { query: { src: pathToFileURL(filePath).href } })
        .catch(() => finish(false))
    } catch {
      finish(false)
    }
  })
}

function isSplashLoadingUrl(url) {
  if (!url) return true
  if (url.startsWith('data:')) return true
  return /loading\.html/i.test(url) || /[\\/]splash[\\/]/i.test(url)
}

function pickReceiptPrinter(printers) {
  if (!Array.isArray(printers) || printers.length === 0) return ''
  const preferred = printers.find((p) => /pos[\s_-]?80/i.test(p.name || ''))
  if (preferred) return preferred.name
  const defaultPrinter = printers.find((p) => p.isDefault)
  if (defaultPrinter) return defaultPrinter.name
  return printers[0].name || ''
}

function setupBackupIpc() {
  ipcMain.handle('pick-backup-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow || undefined, {
      title: 'Chọn thư mục lưu bản sao lưu',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || !result.filePaths?.[0]) return ''
    return writeBackupFolder(result.filePaths[0])
  })

  ipcMain.handle('get-backup-folder', async () => {
    const dir = readBackupFolder()
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch {
      // thư mục sẽ được tạo lại lúc ghi file
    }
    return dir
  })

  ipcMain.handle('set-backup-folder', async (_event, directory) => writeBackupFolder(directory))

  ipcMain.handle('write-backup-file', async (_event, payload) => {
    try {
      const directory = String(payload?.directory || '').trim() || readBackupFolder()
      const fileName = String(payload?.fileName || '').trim() || `taphoa-backup-${Date.now()}.json`
      const data = payload?.data
      if (!directory) return { ok: false, error: 'Thiếu thư mục backup' }
      if (!Array.isArray(data)) return { ok: false, error: 'Dữ liệu backup không hợp lệ' }
      const safeName = path.basename(fileName).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      fs.mkdirSync(directory, { recursive: true })
      const fullPath = path.join(directory, safeName)
      fs.writeFileSync(fullPath, Buffer.from(data))
      return { ok: true, path: fullPath }
    } catch (err) {
      return { ok: false, error: String(err.message || err) }
    }
  })

  ipcMain.handle('allow-close-and-quit', async () => {
    allowCloseOnce = true
    shuttingDown = true
    // Chỉ phát lời cảm ơn khi đã vào app (không còn splash)
    if (appUiReady) {
      await playLocalSound(resolveSoundFile('goodbye'), 8000)
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    } else {
      app.quit()
    }
    return true
  })
}

function normalizePrintPageSize(raw, deviceName) {
  const widthMm = /pos[\s_-]?80|80\s*mm/i.test(deviceName || '') ? 80 : 58
  const fallback = { width: widthMm * 1000, height: 80 * 1000 }
  if (!raw || typeof raw !== 'object') return fallback
  const width = Number(raw.width)
  const height = Number(raw.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1000 || height < 1000) {
    return fallback
  }
  // POS-80: giữ chiều cao theo nội dung, bề ngang đúng khổ máy
  return {
    width: /pos[\s_-]?80|80\s*mm/i.test(deviceName || '') ? 80 * 1000 : Math.round(width),
    height: Math.round(height),
  }
}

function setupPrintIpc() {
  ipcMain.handle('print-silent', async (event, options = {}) => {
    const contents = event.sender
    if (!contents || contents.isDestroyed()) {
      return { success: false, failureReason: 'Cửa sổ in không còn tồn tại' }
    }
    let deviceName = ''
    try {
      const printers = await contents.getPrintersAsync()
      deviceName = pickReceiptPrinter(printers)
    } catch {
      // dùng máy in mặc định của hệ thống
    }
    const pageSize = normalizePrintPageSize(options?.pageSize, deviceName)
    return new Promise((resolve) => {
      contents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: deviceName || undefined,
          margins: { marginType: 'none' },
          // Quan trọng: không để Electron mặc định A4 (lãng phí giấy nhiệt)
          pageSize,
        },
        (success, failureReason) => {
          resolve({
            success: Boolean(success),
            failureReason: success ? '' : String(failureReason || 'In thất bại'),
            deviceName: deviceName || '',
            pageSize,
          })
        },
      )
    })
  })
}

function appIconPath() {
  const packaged = path.join(process.resourcesPath || '', 'icon.png')
  if (app.isPackaged && fs.existsSync(packaged)) return packaged
  const dev = path.join(__dirname, 'build', 'icon.png')
  if (fs.existsSync(dev)) return dev
  const alt = path.join(__dirname, 'resources', 'icon.png')
  return fs.existsSync(alt) ? alt : undefined
}

async function createWindow() {
  const icon = appIconPath()
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: true,
    title: 'Tạp hóa Phúc Sơn — Công nợ',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (e) => {
    if (allowCloseOnce || shuttingDown) {
      allowCloseOnce = false
      return
    }
    // Màn hình khởi động (chưa load React) — cho thoát thẳng
    const url = mainWindow.webContents.getURL()
    if (isSplashLoadingUrl(url)) {
      shuttingDown = true
      return
    }
    e.preventDefault()
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app-close-request')
    }
  })

  const splash = splashLoadingPath()
  const splashDir = path.dirname(splash)
  const splashImage = path.join(splashDir, 'splash.jpg')
  const splashAudio = path.join(splashDir, 'splash.mp3')
  if (fs.existsSync(splash) && fs.existsSync(splashImage)) {
    const query = { src: pathToFileURL(splashImage).href }
    if (fs.existsSync(splashAudio)) {
      query.audio = pathToFileURL(splashAudio).href
    }
    await mainWindow.loadFile(splash, { query })
  } else if (fs.existsSync(splash)) {
    await mainWindow.loadFile(splash)
  } else {
    await mainWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        '<!doctype html><meta charset="utf-8"><title>Đang mở…</title>' +
          '<body style="margin:0;min-height:100vh;display:grid;place-items:center;' +
          'font-family:Segoe UI,sans-serif;background:#111;color:#fff">' +
          '<p>Tạp hóa Phúc Sơn — Đang khởi động…</p></body>',
      )}`,
    )
  }
}

function canConnectTcp(host, port, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    const done = (ok) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

/** Profile mysql cần MySQL đang chạy — báo rõ thay vì để backend chết với mã 1. */
async function assertMysqlReachable() {
  if (process.env.TAPHOA_SKIP_MYSQL_CHECK === '1') return
  const host = process.env.TAPHOA_DB_HOST || '127.0.0.1'
  const port = Number(process.env.TAPHOA_DB_PORT || 3306)
  if (await canConnectTcp(host, port)) return
  throw new Error(
    `Không kết nối được MySQL tại ${host}:${port}.\n` +
      'Hãy cài/bật MySQL 8 (service MySQL80) rồi mở lại ứng dụng.\n' +
      'Dữ liệu cửa hàng nằm trong MySQL, không nằm trong thư mục ứng dụng.',
  )
}

async function boot() {
  try {
    await createWindow()
    if (SKIP_BACKEND) {
      await mainWindow.loadURL(FE_URL || 'http://localhost:5173')
      appUiReady = true
      void playLocalSound(resolveSoundFile('welcome'), 8000)
      return
    }
    await assertMysqlReachable()
    startBackend()
    await waitForServer()
    await mainWindow.loadURL(SERVER_URL)
    appUiReady = true
    // Splash BGM dừng khi navigate; phát chào sau khi UI sẵn sàng
    void playLocalSound(resolveSoundFile('welcome'), 8000)
  } catch (err) {
    stopBackend()
    dialog.showErrorBox('Không mở được ứng dụng', String(err.message || err))
    app.quit()
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    setupPrintIpc()
    setupBackupIpc()
    return boot()
  })

  app.on('before-quit', () => {
    shuttingDown = true
    stopBackend()
  })

  app.on('window-all-closed', () => {
    shuttingDown = true
    stopBackend()
    app.quit()
  })
}
