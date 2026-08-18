const { app, BrowserWindow, nativeImage } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

// App metadata
app.setName("KV Sulur DLMS");
app.setVersion("1.0.0");
if (process.platform === "win32") {
  app.setAppUserModelId("PM SHRI KV Sulur DLMS");
}

function createWindow() {
  const iconPath = path.join(
    isDev ? process.cwd() : path.dirname(process.execPath),
    isDev ? "public/logos/kv.png" : "kv.png"
  );

  let icon;
  try { icon = nativeImage.createFromPath(iconPath); } catch (_) {}

  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    title: "PM SHRI KV Sulur — Digital Library Management System",
    icon: icon || undefined,
    backgroundColor: "#4F46E5",
    show: false, // Will show after ready-to-show for smooth loading
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Show window gracefully once content is loaded (avoids white flash)
  win.once("ready-to-show", () => {
    win.show();
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  // Keep the window title in sync (React might change it)
  win.on("page-title-updated", (e) => {
    e.preventDefault();
    win.setTitle("PM SHRI KV Sulur — Digital Library Management System");
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
