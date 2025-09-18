const { ipcMain } = require("electron");
const axios = require("axios");

class IPCHandlers {
  constructor(managers) {
    this.environmentManager = managers.environmentManager;
    this.databaseManager = managers.databaseManager;
    this.clipboardManager = managers.clipboardManager;
    this.funasrManager = managers.funasrManager;
    this.windowManager = managers.windowManager;
    
    this.setupHandlers();
  }

  setupHandlers() {
    // 环境和配置相关
    ipcMain.handle("get-config", () => {
      return this.environmentManager.exportConfig();
    });

    ipcMain.handle("validate-environment", () => {
      return this.environmentManager.validateEnvironment();
    });

    // 录音相关
    ipcMain.handle("start-recording", async () => {
      // TODO: 实现录音开始功能
      return { success: true };
    });

    ipcMain.handle("stop-recording", async () => {
      // TODO: 实现录音停止功能
      return { success: true };
    });

    // Python 和 FunASR 相关
    ipcMain.handle("check-python", async () => {
      return await this.funasrManager.checkPythonInstallation();
    });

    ipcMain.handle("install-python", async (event, progressCallback) => {
      return await this.funasrManager.installPython((progress) => {
        event.sender.send("python-install-progress", progress);
      });
    });

    ipcMain.handle("check-funasr", async () => {
      return await this.funasrManager.checkFunASRInstallation();
    });

    ipcMain.handle("check-funasr-status", async () => {
      const status = await this.funasrManager.checkStatus();
      
      // 添加模型初始化状态信息
      return {
        ...status,
        models_initialized: this.funasrManager.modelsInitialized,
        server_ready: this.funasrManager.serverReady,
        is_initializing: this.funasrManager.initializationPromise !== null
      };
    });

    ipcMain.handle("install-funasr", async (event) => {
      return await this.funasrManager.installFunASR((progress) => {
        event.sender.send("funasr-install-progress", progress);
      });
    });

    ipcMain.handle("funasr-status", async () => {
      return await this.funasrManager.checkStatus();
    });

    // AI文本处理
    ipcMain.handle("process-text", async (event, text, mode = 'optimize') => {
      return await this.processTextWithAI(text, mode);
    });

    ipcMain.handle("check-ai-status", async () => {
      return await this.checkAIStatus();
    });

    // 音频转录相关
    ipcMain.handle("transcribe-audio", async (event, audioData, options) => {
      return await this.funasrManager.transcribeAudio(audioData, options);
    });

    // 数据库相关
    ipcMain.handle("save-transcription", (event, data) => {
      return this.databaseManager.saveTranscription(data);
    });

    ipcMain.handle("get-transcriptions", (event, limit, offset) => {
      return this.databaseManager.getTranscriptions(limit, offset);
    });

    ipcMain.handle("get-transcription", (event, id) => {
      return this.databaseManager.getTranscriptionById(id);
    });

    ipcMain.handle("delete-transcription", (event, id) => {
      return this.databaseManager.deleteTranscription(id);
    });

    ipcMain.handle("search-transcriptions", (event, query, limit) => {
      return this.databaseManager.searchTranscriptions(query, limit);
    });

    ipcMain.handle("get-transcription-stats", () => {
      return this.databaseManager.getTranscriptionStats();
    });

    ipcMain.handle("clear-all-transcriptions", () => {
      return this.databaseManager.clearAllTranscriptions();
    });

    // 设置相关
    ipcMain.handle("get-setting", (event, key, defaultValue) => {
      return this.databaseManager.getSetting(key, defaultValue);
    });

    ipcMain.handle("set-setting", (event, key, value) => {
      return this.databaseManager.setSetting(key, value);
    });

    ipcMain.handle("get-all-settings", () => {
      return this.databaseManager.getAllSettings();
    });

    ipcMain.handle("get-settings", () => {
      return this.databaseManager.getAllSettings();
    });

    ipcMain.handle("save-setting", (event, key, value) => {
      return this.databaseManager.setSetting(key, value);
    });

    ipcMain.handle("reset-settings", () => {
      // TODO: 实现重置设置功能
      return this.databaseManager.resetSettings();
    });

    // 剪贴板相关
    ipcMain.handle("copy-text", (event, text) => {
      return this.clipboardManager.copyText(text);
    });

    ipcMain.handle("paste-text", () => {
      return this.clipboardManager.pasteText();
    });

    ipcMain.handle("get-clipboard-history", () => {
      return this.clipboardManager.getHistory();
    });

    ipcMain.handle("clear-clipboard-history", () => {
      this.clipboardManager.clearHistory();
      return true;
    });

    // 窗口管理相关
    ipcMain.handle("hide-window", () => {
      if (this.windowManager.mainWindow) {
        this.windowManager.mainWindow.hide();
      }
      return true;
    });

    ipcMain.handle("show-window", () => {
      if (this.windowManager.mainWindow) {
        this.windowManager.mainWindow.show();
      }
      return true;
    });

    ipcMain.handle("minimize-window", () => {
      if (this.windowManager.mainWindow) {
        this.windowManager.mainWindow.minimize();
      }
      return true;
    });

    ipcMain.handle("close-window", () => {
      if (this.windowManager.mainWindow) {
        this.windowManager.mainWindow.close();
      }
      return true;
    });

    ipcMain.handle("show-control-panel", () => {
      this.windowManager.showControlPanel();
      return true;
    });

    ipcMain.handle("hide-control-panel", () => {
      this.windowManager.hideControlPanel();
      return true;
    });

    ipcMain.handle("open-control-panel", () => {
      this.windowManager.showControlPanel();
      return true;
    });

    ipcMain.handle("close-control-panel", () => {
      this.windowManager.hideControlPanel();
      return true;
    });

    ipcMain.handle("open-history-window", () => {
      this.windowManager.showHistoryWindow();
      return true;
    });

    ipcMain.handle("close-history-window", () => {
      this.windowManager.closeHistoryWindow();
      return true;
    });

    ipcMain.handle("hide-history-window", () => {
      this.windowManager.hideHistoryWindow();
      return true;
    });

    ipcMain.handle("close-app", () => {
      require("electron").app.quit();
    });

    // 热键管理
    ipcMain.handle("register-hotkey", (event, hotkey) => {
      // TODO: 实现热键注册功能
      return { success: true };
    });

    ipcMain.handle("unregister-hotkey", () => {
      // TODO: 实现热键注销功能
      return { success: true };
    });

    ipcMain.handle("get-current-hotkey", () => {
      // TODO: 实现获取当前热键功能
      return "CommandOrControl+Shift+Space";
    });

    // 文件操作
    ipcMain.handle("export-transcriptions", (event, format) => {
      // TODO: 实现导出转录功能
      return { success: true, path: "" };
    });

    ipcMain.handle("import-settings", () => {
      // TODO: 实现导入设置功能
      return { success: true };
    });

    ipcMain.handle("export-settings", () => {
      // TODO: 实现导出设置功能
      return { success: true, path: "" };
    });

    // 文件系统相关
    ipcMain.handle("show-item-in-folder", (event, fullPath) => {
      require("electron").shell.showItemInFolder(fullPath);
    });

    ipcMain.handle("open-external", (event, url) => {
      require("electron").shell.openExternal(url);
    });

    // 系统信息
    ipcMain.handle("get-system-info", () => {
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
      };
    });

    ipcMain.handle("check-permissions", () => {
      // TODO: 实现权限检查功能
      return { microphone: true, accessibility: true };
    });

    ipcMain.handle("request-permissions", () => {
      // TODO: 实现权限请求功能
      return { success: true };
    });

    // 应用信息
    ipcMain.handle("get-app-version", () => {
      return require("electron").app.getVersion();
    });

    ipcMain.handle("get-app-path", (event, name) => {
      return require("electron").app.getPath(name);
    });

    ipcMain.handle("check-for-updates", () => {
      // TODO: 实现更新检查功能
      return { hasUpdate: false };
    });

    // 调试和日志
    ipcMain.handle("log", (event, level, message, data) => {
      console[level](`[渲染进程] ${message}`, data || "");
      return true;
    });

    ipcMain.handle("get-debug-info", () => {
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        appVersion: require("electron").app.getVersion()
      };
    });

    // 保持向后兼容性
    ipcMain.handle("log-message", (event, level, message, data) => {
      console[level](`[渲染进程] ${message}`, data || "");
      return true;
    });

    // 中文特定功能
    ipcMain.handle("detect-language", (event, text) => {
      // TODO: 实现语言检测功能
      return { language: "zh-CN", confidence: 0.95 };
    });

    ipcMain.handle("segment-chinese", (event, text) => {
      // TODO: 实现中文分词功能
      return { segments: text.split("") };
    });

    ipcMain.handle("add-punctuation", (event, text) => {
      // TODO: 实现标点符号添加功能
      return { text: text };
    });

    // 音频处理
    ipcMain.handle("convert-audio-format", (event, audioData, targetFormat) => {
      // TODO: 实现音频格式转换功能
      return { success: true, data: audioData };
    });

    ipcMain.handle("enhance-audio", (event, audioData) => {
      // TODO: 实现音频增强功能
      return { success: true, data: audioData };
    });

    // 模型管理
    ipcMain.handle("download-model", (event, modelName) => {
      // TODO: 实现模型下载功能
      return { success: true };
    });

    ipcMain.handle("get-available-models", () => {
      // TODO: 实现获取可用模型功能
      return { models: [] };
    });

    ipcMain.handle("get-current-model", () => {
      // TODO: 实现获取当前模型功能
      return { model: "paraformer-large" };
    });

    ipcMain.handle("switch-model", (event, modelName) => {
      // TODO: 实现切换模型功能
      return { success: true };
    });

    // 性能监控
    ipcMain.handle("get-performance-stats", () => {
      // TODO: 实现性能统计功能
      return { stats: {} };
    });

    ipcMain.handle("clear-performance-stats", () => {
      // TODO: 实现清除性能统计功能
      return { success: true };
    });

    // 错误报告
    ipcMain.handle("report-error", (event, error) => {
      console.error("渲染进程错误:", error);
      // TODO: 实现错误报告功能
      return true;
    });

    // 开发工具
    if (process.env.NODE_ENV === "development") {
      ipcMain.handle("open-dev-tools", (event) => {
        const window = require("electron").BrowserWindow.fromWebContents(event.sender);
        if (window) {
          window.webContents.openDevTools();
        }
      });

      ipcMain.handle("reload-window", (event) => {
        const window = require("electron").BrowserWindow.fromWebContents(event.sender);
        if (window) {
          window.reload();
        }
      });
    }
  }

  // AI文本处理方法
  async processTextWithAI(text, mode = 'optimize') {
    try {
      // 从环境变量或设置中获取API密钥
      const apiKey = process.env.AI_API_KEY || await this.databaseManager.getSetting('ai_api_key');
      if (!apiKey) {
        return {
          success: false,
          error: '请先配置AI API密钥'
        };
      }

      const prompts = {
        format: `请将以下语音识别文本进行格式化，添加适当的段落分隔和标点符号，使其更易阅读：\n\n${text}`,
        correct: `请纠正以下文本中的语法错误、错别字和语音识别错误，保持原意不变：\n\n${text}`,
        optimize: `请优化以下文本的表达，使其更加流畅、专业和易懂，去除口语化表达和冗余内容：\n\n${text}`,
        summarize: `请总结以下文本的主要内容，提取关键信息：\n\n${text}`,
        asr_enhance: `请对以下语音识别原始文本进行谨慎优化，重点是纠错而非改写：

**优化原则（按重要性排序）：**
1. **严格保持原意和语义不变** - 这是最重要的原则
2. 纠正明显的语音识别错误（如同音字错误：晴/情、到/道等）
3. 添加必要的标点符号，但不改变句子结构
4. 保留原文的语言风格（包括古诗词、方言、口语等）
5. 如果是诗词、成语、俗语等固定表达，请保持原样

**特别注意：**
- 对于可能是诗词、成语、俗语的内容，优先保持原有表达
- 同音字替换时要考虑上下文语义
- 宁可保守处理，也不要过度修改

原始文本：
${text}

请直接返回优化后的文本，不需要解释过程。`
      };

      const baseUrl = process.env.AI_BASE_URL || await this.databaseManager.getSetting('ai_base_url') || 'https://api.openai.com/v1';
      const model = process.env.AI_MODEL || await this.databaseManager.getSetting('ai_model') || 'gpt-3.5-turbo';

      const response = await axios.post(`${baseUrl}/chat/completions`, {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompts[mode] || prompts.optimize
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      });

      if (response.data.choices && response.data.choices.length > 0) {
        return {
          success: true,
          text: response.data.choices[0].message.content.trim(),
          usage: response.data.usage,
          model: model
        };
      } else {
        return {
          success: false,
          error: 'AI API返回数据格式错误'
        };
      }
    } catch (error) {
      console.error('AI文本处理失败:', error);
      
      let errorMessage = '文本处理失败';
      if (error.response) {
        // API错误响应
        if (error.response.status === 401) {
          errorMessage = 'API密钥无效，请检查配置';
        } else if (error.response.status === 429) {
          errorMessage = 'API调用频率超限，请稍后重试';
        } else if (error.response.status === 500) {
          errorMessage = 'AI服务器错误，请稍后重试';
        } else {
          errorMessage = `API错误: ${error.response.status}`;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，请检查网络连接';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = '无法连接到AI服务器，请检查网络';
      } else {
        errorMessage = error.message || '未知错误';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // 检查AI状态
  async checkAIStatus() {
    try {
      const apiKey = process.env.AI_API_KEY || await this.databaseManager.getSetting('ai_api_key');
      if (!apiKey) {
        return {
          available: false,
          error: '未配置API密钥'
        };
      }

      const baseUrl = process.env.AI_BASE_URL || await this.databaseManager.getSetting('ai_base_url') || 'https://api.openai.com/v1';
      const model = process.env.AI_MODEL || await this.databaseManager.getSetting('ai_model') || 'gpt-3.5-turbo';
      
      // 发送一个简单的测试请求
      const response = await axios.post(`${baseUrl}/chat/completions`, {
        model: model,
        messages: [
          {
            role: 'user',
            content: '测试'
          }
        ],
        max_tokens: 10
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        available: true,
        model: model,
        status: 'connected'
      };
    } catch (error) {
      return {
        available: false,
        error: error.response?.status === 401 ? 'API密钥无效' : '连接失败'
      };
    }
  }

  // 清理处理器
  removeAllHandlers() {
    ipcMain.removeAllListeners();
  }
}

module.exports = IPCHandlers;