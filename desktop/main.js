const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const http = require('http')

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

function backupConfigPath() {
  return path.join(app.getPath('userData'), 'backup-folder.json')
}

function readBackupFolder() {
  try {
    const raw = fs.readFileSync(backupConfigPath(), 'utf8')
    const data = JSON.parse(raw)
    return typeof data.directory === 'string' ? data.directory : ''
  } catch {
    return ''
  }
}

function writeBackupFolder(directory) {
  const dir = String(directory || '').trim()
  fs.writeFileSync(backupConfigPath(), JSON.stringify({ directory: dir }, null, 2), 'utf8')
  return dir
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
  }

  const logFile = path.join(app.getPath('userData'), 'backend.log')
  const logStream = fs.createWriteStream(logFile, { flags: 'a' })
  logStream.write(`\n==== ${new Date().toISOString()} port=${SERVER_PORT} ====\n`)

  // MySQL (tap_hoa) — cần MySQL đang chạy trên máy; cấu hình trong application-mysql.properties
  javaProcess = spawn(
    java,
    [
      '-jar',
      jar,
      `--server.port=${SERVER_PORT}`,
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

function loadingHtml() {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html><head><meta charset="utf-8"><title>Đang mở...</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:Segoe UI,sans-serif;background:#f3efe6;color:#1f2a24}
.box{text-align:center;padding:2rem}
h1{font-size:1.35rem;margin:0 0 .5rem}
p{color:#5c6b63;margin:0}
</style></head>
<body><div class="box"><h1>Tạp hóa Phúc Sơn</h1><p>Đang khởi động, vui lòng chờ...</p></div></body></html>`)}`
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

  ipcMain.handle('get-backup-folder', async () => readBackupFolder())

  ipcMain.handle('set-backup-folder', async (_event, directory) => writeBackupFolder(directory))

  ipcMain.handle('write-backup-file', async (_event, payload) => {
    try {
      const directory = String(payload?.directory || '').trim()
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    } else {
      app.quit()
    }
    return true
  })
}

function setupPrintIpc() {
  ipcMain.handle('print-silent', async (event) => {
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
    return new Promise((resolve) => {
      contents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: deviceName || undefined,
          margins: { marginType: 'none' },
        },
        (success, failureReason) => {
          resolve({
            success: Boolean(success),
            failureReason: success ? '' : String(failureReason || 'In thất bại'),
            deviceName: deviceName || '',
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
    if (!url || url.startsWith('data:')) {
      shuttingDown = true
      return
    }
    e.preventDefault()
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app-close-request')
    }
  })

  await mainWindow.loadURL(loadingHtml())
}

async function boot() {
  try {
    await createWindow()
    if (SKIP_BACKEND) {
      await mainWindow.loadURL(FE_URL || 'http://localhost:5173')
      return
    }
    startBackend()
    await waitForServer()
    await mainWindow.loadURL(SERVER_URL)
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
