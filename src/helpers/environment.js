const path = require("path");
const fs = require("fs");
const os = require("os");

class EnvironmentManager {
  constructor() {
    this.loadEnvironmentVariables();
  }

  loadEnvironmentVariables() {
    // 加载 .env 文件
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      require("dotenv").config({ path: envPath });
    }
  }

  getAIConfig() {
    // AI配置现在通过控制面板设置，不再从环境变量读取
    return {
      apiKey: "",
      baseURL: "https://api.openai.com/v1",
      model: "gpt-3.5-turbo",
    };
  }

  getAudioConfig() {
    return {
      sampleRate: parseInt(process.env.AUDIO_SAMPLE_RATE) || 16000,
      channels: parseInt(process.env.AUDIO_CHANNELS) || 1,
      format: process.env.AUDIO_FORMAT || "wav",
    };
  }

  getFunASRConfig() {
    return {
      modelDir: process.env.FUNASR_MODEL_DIR || "./models",
      cacheDir: process.env.FUNASR_CACHE_DIR || "./cache",
      batchSize: parseInt(process.env.BATCH_SIZE) || 300,
      hotwords: process.env.HOTWORDS ? process.env.HOTWORDS.split(",") : [],
    };
  }

  getAppConfig() {
    return {
      debug: process.env.DEBUG === "true",
      logLevel: process.env.LOG_LEVEL || "info",
      language: process.env.LANGUAGE || "zh-CN",
      theme: process.env.THEME || "auto",
      windowAlwaysOnTop: process.env.WINDOW_ALWAYS_ON_TOP === "true",
      startMinimized: process.env.START_MINIMIZED === "true",
      globalHotkey: process.env.GLOBAL_HOTKEY || "CommandOrControl+Shift+Space",
    };
  }

  getDatabaseConfig() {
    return {
      path: process.env.DATABASE_PATH || "./data/transcriptions.db",
      backupEnabled: process.env.BACKUP_ENABLED !== "false",
      backupInterval: parseInt(process.env.BACKUP_INTERVAL) || 24,
    };
  }

  getProxyConfig() {
    return {
      http: process.env.HTTP_PROXY || "",
      https: process.env.HTTPS_PROXY || "",
    };
  }

  getPerformanceConfig() {
    return {
      maxRecordingDuration: parseInt(process.env.MAX_RECORDING_DURATION) || 300,
      maxTextLength: parseInt(process.env.MAX_TEXT_LENGTH) || 10000,
    };
  }

  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      osType: os.type(),
      osRelease: os.release(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      homeDir: os.homedir(),
      tmpDir: os.tmpdir(),
    };
  }

  isDevelopment() {
    return process.env.NODE_ENV === "development";
  }

  isProduction() {
    return process.env.NODE_ENV === "production";
  }

  getDataDirectory() {
    const appName = "蛐蛐";
    
    switch (process.platform) {
      case "win32":
        return path.join(os.homedir(), "AppData", "Roaming", appName);
      case "darwin":
        return path.join(os.homedir(), "Library", "Application Support", appName);
      case "linux":
        return path.join(os.homedir(), ".config", appName);
      default:
        return path.join(os.homedir(), `.${appName.toLowerCase()}`);
    }
  }

  ensureDataDirectory() {
    const dataDir = this.getDataDirectory();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return dataDir;
  }

  getLogDirectory() {
    const dataDir = this.ensureDataDirectory();
    const logDir = path.join(dataDir, "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return logDir;
  }

  getCacheDirectory() {
    const dataDir = this.ensureDataDirectory();
    const cacheDir = path.join(dataDir, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
  }

  getModelsDirectory() {
    const dataDir = this.ensureDataDirectory();
    const modelsDir = path.join(dataDir, "models");
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }
    return modelsDir;
  }

  validateEnvironment() {
    const issues = [];
    
    // 检查目录权限
    try {
      this.ensureDataDirectory();
    } catch (error) {
      issues.push(`无法创建数据目录: ${error.message}`);
    }
    
    // 检查系统要求
    const systemInfo = this.getSystemInfo();
    const nodeVersion = parseInt(systemInfo.nodeVersion.substring(1));
    if (nodeVersion < 18) {
      issues.push(`Node.js 版本过低: ${systemInfo.nodeVersion}，需要 18+`);
    }
    
    return {
      valid: issues.length === 0,
      issues,
      systemInfo
    };
  }

  exportConfig() {
    return {
      ai: this.getAIConfig(),
      audio: this.getAudioConfig(),
      funasr: this.getFunASRConfig(),
      app: this.getAppConfig(),
      database: this.getDatabaseConfig(),
      proxy: this.getProxyConfig(),
      performance: this.getPerformanceConfig(),
      system: this.getSystemInfo(),
      directories: {
        data: this.getDataDirectory(),
        logs: this.getLogDirectory(),
        cache: this.getCacheDirectory(),
        models: this.getModelsDirectory(),
      }
    };
  }
}

module.exports = EnvironmentManager;