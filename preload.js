const { contextBridge, ipcRenderer } = require("electron");

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld("electronAPI", {
  // 窗口控制
  hideWindow: () => ipcRenderer.invoke("hide-window"),
  showWindow: () => ipcRenderer.invoke("show-window"),
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  closeWindow: () => ipcRenderer.invoke("close-window"),

  // 录音相关
  startRecording: () => ipcRenderer.invoke("start-recording"),
  stopRecording: () => ipcRenderer.invoke("stop-recording"),
  onToggleDictation: (callback) => {
    ipcRenderer.on("toggle-dictation", callback);
    return () => ipcRenderer.removeListener("toggle-dictation", callback);
  },

  // FunASR语音识别
  transcribeAudio: (audioData) => ipcRenderer.invoke("transcribe-audio", audioData),
  checkFunASRStatus: () => ipcRenderer.invoke("check-funasr-status"),
  installFunASR: () => ipcRenderer.invoke("install-funasr"),
  restartFunasrServer: () => ipcRenderer.invoke("restart-funasr-server"),

  // 模型文件管理
  checkModelFiles: () => ipcRenderer.invoke("check-model-files"),
  getDownloadProgress: () => ipcRenderer.invoke("get-download-progress"),
  downloadModels: () => ipcRenderer.invoke("download-models"),

  // AI文本处理
  processText: (text, mode) => ipcRenderer.invoke("process-text", text, mode),
  checkAIStatus: (testConfig) => ipcRenderer.invoke("check-ai-status", testConfig),

  // 剪贴板操作
  pasteText: (text) => ipcRenderer.invoke("paste-text", text),
  copyText: (text) => ipcRenderer.invoke("copy-text", text),
  readClipboard: () => ipcRenderer.invoke("read-clipboard"),
  writeClipboard: (text) => ipcRenderer.invoke("write-clipboard", text),

  // 数据库操作
  saveTranscription: (text, processedText) => 
    ipcRenderer.invoke("save-transcription", text, processedText),
  getTranscriptions: (limit, offset) => 
    ipcRenderer.invoke("get-transcriptions", limit, offset),
  deleteTranscription: (id) => 
    ipcRenderer.invoke("delete-transcription", id),
  clearAllTranscriptions: () => 
    ipcRenderer.invoke("clear-all-transcriptions"),

  // 设置管理
  getSettings: () => ipcRenderer.invoke("get-settings"),
  getAllSettings: () => ipcRenderer.invoke("get-all-settings"),
  getSetting: (key, defaultValue) => ipcRenderer.invoke("get-setting", key, defaultValue),
  setSetting: (key, value) => ipcRenderer.invoke("set-setting", key, value),
  saveSetting: (key, value) => ipcRenderer.invoke("save-setting", key, value),
  resetSettings: () => ipcRenderer.invoke("reset-settings"),

  // 热键管理
  registerHotkey: (hotkey) => ipcRenderer.invoke("register-hotkey", hotkey),
  unregisterHotkey: (hotkey) => ipcRenderer.invoke("unregister-hotkey", hotkey),
  getCurrentHotkey: () => ipcRenderer.invoke("get-current-hotkey"),
  
  // F2热键管理
  registerF2Hotkey: () => ipcRenderer.invoke("register-f2-hotkey"),
  unregisterF2Hotkey: () => ipcRenderer.invoke("unregister-f2-hotkey"),
  setRecordingState: (isRecording) => ipcRenderer.invoke("set-recording-state", isRecording),
  getRecordingState: () => ipcRenderer.invoke("get-recording-state"),
  
  // F2双击事件监听
  onF2DoubleClick: (callback) => {
    ipcRenderer.on("f2-double-click", callback);
    return () => ipcRenderer.removeListener("f2-double-click", callback);
  },
  
  // 热键触发事件监听
  onHotkeyTriggered: (callback) => {
    ipcRenderer.on("hotkey-triggered", callback);
    return () => ipcRenderer.removeListener("hotkey-triggered", callback);
  },

  // 文件操作
  exportTranscriptions: (format) => ipcRenderer.invoke("export-transcriptions", format),
  importSettings: () => ipcRenderer.invoke("import-settings"),
  exportSettings: () => ipcRenderer.invoke("export-settings"),

  // 系统信息
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  checkPermissions: () => ipcRenderer.invoke("check-permissions"),
  requestPermissions: () => ipcRenderer.invoke("request-permissions"),
  testAccessibilityPermission: () => ipcRenderer.invoke("test-accessibility-permission"),
  openSystemPermissions: () => ipcRenderer.invoke("open-system-permissions"),

  // 应用信息
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),

  // 调试和日志
  log: (level, message) => ipcRenderer.invoke("log", level, message),
  getDebugInfo: () => ipcRenderer.invoke("get-debug-info"),

  // 事件监听
  onTranscriptionUpdate: (callback) => {
    ipcRenderer.on("transcription-update", callback);
    return () => ipcRenderer.removeListener("transcription-update", callback);
  },
  onProcessingUpdate: (callback) => {
    ipcRenderer.on("processing-update", callback);
    return () => ipcRenderer.removeListener("processing-update", callback);
  },
  onError: (callback) => {
    ipcRenderer.on("error", callback);
    return () => ipcRenderer.removeListener("error", callback);
  },
  onSettingsUpdate: (callback) => {
    ipcRenderer.on("settings-update", callback);
    return () => ipcRenderer.removeListener("settings-update", callback);
  },

  // 控制面板相关
  openControlPanel: () => ipcRenderer.invoke("open-control-panel"),
  closeControlPanel: () => ipcRenderer.invoke("close-control-panel"),

  // 历史记录窗口相关
  openHistoryWindow: () => ipcRenderer.invoke("open-history-window"),
  closeHistoryWindow: () => ipcRenderer.invoke("close-history-window"),
  hideHistoryWindow: () => ipcRenderer.invoke("hide-history-window"),

  // 设置窗口相关
  openSettingsWindow: () => ipcRenderer.invoke("open-settings-window"),
  closeSettingsWindow: () => ipcRenderer.invoke("close-settings-window"),
  hideSettingsWindow: () => ipcRenderer.invoke("hide-settings-window"),

  // 中文特定功能
  detectLanguage: (text) => ipcRenderer.invoke("detect-language", text),
  segmentChinese: (text) => ipcRenderer.invoke("segment-chinese", text),
  addPunctuation: (text) => ipcRenderer.invoke("add-punctuation", text),

  // 音频处理
  convertAudioFormat: (audioData, targetFormat) => 
    ipcRenderer.invoke("convert-audio-format", audioData, targetFormat),
  enhanceAudio: (audioData) => ipcRenderer.invoke("enhance-audio", audioData),

  // 模型管理
  downloadModel: (modelName) => ipcRenderer.invoke("download-model", modelName),
  getAvailableModels: () => ipcRenderer.invoke("get-available-models"),
  getCurrentModel: () => ipcRenderer.invoke("get-current-model"),
  switchModel: (modelName) => ipcRenderer.invoke("switch-model", modelName),

  // 模型下载进度监听
  onModelDownloadProgress: (callback) => {
    ipcRenderer.on("model-download-progress", callback);
    return () => ipcRenderer.removeListener("model-download-progress", callback);
  },

  // 性能监控
  getPerformanceStats: () => ipcRenderer.invoke("get-performance-stats"),
  clearPerformanceStats: () => ipcRenderer.invoke("clear-performance-stats")
});

// 添加一些实用的常量
contextBridge.exposeInMainWorld("constants", {
  APP_NAME: "蛐蛐 (QuQu)",
  VERSION: "1.0.0",
  SUPPORTED_AUDIO_FORMATS: ["wav", "mp3", "m4a", "flac"],
  SUPPORTED_EXPORT_FORMATS: ["txt", "docx", "pdf", "json"],
  DEFAULT_HOTKEY: "CommandOrControl+Shift+Space",
  MAX_RECORDING_DURATION: 300000, // 5分钟
  MAX_TEXT_LENGTH: 10000,
  CHINESE_LANGUAGE_CODES: ["zh", "zh-CN", "zh-TW", "zh-HK"]
});

// 添加调试信息（仅在开发模式下）
if (process.env.NODE_ENV === "development") {
  contextBridge.exposeInMainWorld("debug", {
    getElectronVersion: () => process.versions.electron,
    getNodeVersion: () => process.versions.node,
    getChromeVersion: () => process.versions.chrome,
    getPlatform: () => process.platform,
    getArch: () => process.arch
  });
}