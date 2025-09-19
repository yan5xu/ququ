const { app, globalShortcut, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

// 添加全局错误处理
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  if (error.code === "EPIPE") {
    return;
  }
  console.error("Error stack:", error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// 导入助手模块
const EnvironmentManager = require("./src/helpers/environment");
const WindowManager = require("./src/helpers/windowManager");
const DatabaseManager = require("./src/helpers/database");
const ClipboardManager = require("./src/helpers/clipboard");
const FunASRManager = require("./src/helpers/funasrManager");
const TrayManager = require("./src/helpers/tray");
const HotkeyManager = require("./src/helpers/hotkeyManager");
const IPCHandlers = require("./src/helpers/ipcHandlers");

// 设置生产环境PATH
function setupProductionPath() {
  if (process.platform === 'darwin' && process.env.NODE_ENV !== 'development') {
    const commonPaths = [
      '/usr/local/bin',
      '/opt/homebrew/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
      '/Library/Frameworks/Python.framework/Versions/3.11/bin',
      '/Library/Frameworks/Python.framework/Versions/3.10/bin',
      '/Library/Frameworks/Python.framework/Versions/3.9/bin'
    ];
    
    const currentPath = process.env.PATH || '';
    const pathsToAdd = commonPaths.filter(p => !currentPath.includes(p));
    
    if (pathsToAdd.length > 0) {
      process.env.PATH = `${currentPath}:${pathsToAdd.join(':')}`;
    }
  }
}

// 在初始化管理器之前设置PATH
setupProductionPath();

// 初始化管理器
const environmentManager = new EnvironmentManager();
const windowManager = new WindowManager();
const databaseManager = new DatabaseManager();
const clipboardManager = new ClipboardManager();
const funasrManager = new FunASRManager();
const trayManager = new TrayManager();
const hotkeyManager = new HotkeyManager();

// 初始化数据库
const dataDirectory = environmentManager.ensureDataDirectory();
databaseManager.initialize(dataDirectory);

// 使用所有管理器初始化IPC处理器
const ipcHandlers = new IPCHandlers({
  environmentManager,
  databaseManager,
  clipboardManager,
  funasrManager,
  windowManager,
  hotkeyManager,
});

// 主应用启动函数
async function startApp() {
  // 开发模式下添加小延迟让Vite正确启动
  if (process.env.NODE_ENV === "development") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // 确保macOS上dock可见
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show();
  }

  // 在启动时初始化FunASR管理器（不等待以避免阻塞）
  funasrManager.initializeAtStartup().catch((err) => {
    console.log("FunASR在启动时不可用，这不是关键问题");
  });

  // 创建主窗口
  try {
    await windowManager.createMainWindow();
  } catch (error) {
    console.error("创建主窗口时出错:", error);
  }

  // 创建控制面板窗口
  try {
    await windowManager.createControlPanelWindow();
  } catch (error) {
    console.error("创建控制面板窗口时出错:", error);
  }

  // 设置托盘
  trayManager.setWindows(
    windowManager.mainWindow,
    windowManager.controlPanelWindow
  );
  trayManager.setCreateControlPanelCallback(() =>
    windowManager.createControlPanelWindow()
  );
  await trayManager.createTray();
}

// 应用事件处理器
app.whenReady().then(() => {
  startApp();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createMainWindow();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// 导出管理器供其他模块使用
module.exports = {
  environmentManager,
  windowManager,
  databaseManager,
  clipboardManager,
  funasrManager,
  trayManager,
  hotkeyManager
};