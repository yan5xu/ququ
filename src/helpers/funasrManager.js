const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const PythonInstaller = require("./pythonInstaller");
const { runCommand, TIMEOUTS } = require("../utils/process");

// 简单的全局缓存，避免频繁检查
let globalModelCheckCache = null;
let globalModelCheckTime = 0;
const GLOBAL_CACHE_TIME = 2000; // 减少到2秒缓存，确保及时更新

class FunASRManager {
  constructor(logger = null) {
    this.logger = logger || console; // 使用传入的logger或默认console
    this.pythonCmd = null; // 缓存 Python 可执行文件路径
    this.funasrInstalled = null; // 缓存安装状态
    this.isInitialized = false; // 跟踪启动初始化是否完成
    this.pythonInstaller = new PythonInstaller();
    this.modelsInitialized = false; // 跟踪模型是否已初始化
    this.initializationPromise = null; // 缓存初始化Promise
    this.serverProcess = null; // FunASR服务器进程
    this.serverReady = false; // 服务器是否就绪
    this.modelsDownloaded = null; // 缓存模型下载状态
    
    // 简化缓存
    this._cachedPythonEnv = null;
    this._lastEmbeddedCheck = null;
    
    // 模型配置
    this.modelConfigs = {
      "asr": {
        "name": "damo/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
        "cache_path": "speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
        "expected_size": 840 * 1024 * 1024  // 840MB
      },
      "vad": {
        "name": "damo/speech_fsmn_vad_zh-cn-16k-common-pytorch",
        "cache_path": "speech_fsmn_vad_zh-cn-16k-common-pytorch",
        "expected_size": 1.6 * 1024 * 1024  // 1.6MB
      },
      "punc": {
        "name": "damo/punc_ct-transformer_zh-cn-common-vocab272727-pytorch",
        "cache_path": "punc_ct-transformer_zh-cn-common-vocab272727-pytorch",
        "expected_size": 278 * 1024 * 1024  // 278MB
      }
    };
  }


  getFunASRServerPath() {
    // 获取FunASR服务器脚本路径
    if (process.env.NODE_ENV === "development") {
      return path.join(__dirname, "..", "..", "funasr_server.py");
    } else {
      return path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "funasr_server.py"
      );
    }
  }

  getEmbeddedPythonPath() {
    // 获取嵌入式Python路径
    if (process.env.NODE_ENV === "development") {
      return path.join(__dirname, "..", "..", "python", "bin", "python3.11");
    } else {
      return path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "python",
        "bin",
        "python3.11"
      );
    }
  }

  setupIsolatedEnvironment() {
    // 设置Python环境变量，根据实际使用的Python来决定
    const embeddedPythonPath = this.getEmbeddedPythonPath();
    const isUsingEmbedded = fs.existsSync(embeddedPythonPath);
    
    if (isUsingEmbedded) {
      // 使用嵌入式Python时设置完全隔离的环境变量
      const pythonHome = path.dirname(path.dirname(embeddedPythonPath));
      const sitePackages = path.join(pythonHome, 'lib', 'python3.11', 'site-packages');
      
      process.env.PYTHONHOME = pythonHome;
      process.env.PYTHONPATH = sitePackages;
      process.env.PYTHONDONTWRITEBYTECODE = '1';
      process.env.PYTHONIOENCODING = 'utf-8';
      process.env.PYTHONUNBUFFERED = '1';
      
      this.logger.info && this.logger.info('设置嵌入式Python环境', {
        PYTHONHOME: process.env.PYTHONHOME,
        PYTHONPATH: process.env.PYTHONPATH,
        pythonExecutable: embeddedPythonPath
      });
    } else {
      // 使用系统Python时，清除可能干扰的嵌入式Python环境变量
      delete process.env.PYTHONHOME;
      delete process.env.PYTHONPATH;
      
      // 设置基础环境变量
      process.env.PYTHONDONTWRITEBYTECODE = '1';
      process.env.PYTHONIOENCODING = 'utf-8';
      process.env.PYTHONUNBUFFERED = '1';
      
      this.logger.info && this.logger.info('设置系统Python环境', {
        note: '清除嵌入式Python环境变量，使用系统Python默认环境',
        pythonExecutable: this.pythonCmd || '未确定'
      });
    }
    
    // 清除可能干扰的系统Python环境变量
    delete process.env.PYTHONUSERBASE;
    delete process.env.PYTHONSTARTUP;
    delete process.env.VIRTUAL_ENV;
  }

  buildPythonEnvironment() {
    // 构建完整的Python环境变量，根据实际使用的Python路径来配置
    const embeddedPythonPath = this.getEmbeddedPythonPath();
    const isUsingEmbedded = fs.existsSync(embeddedPythonPath);
    
    // 缓存环境变量，避免重复构建和日志输出
    if (this._cachedPythonEnv && this._lastEmbeddedCheck === isUsingEmbedded) {
      return this._cachedPythonEnv;
    }
    
    let env = {
      ...process.env,
      // 基础Python环境变量
      PYTHONDONTWRITEBYTECODE: '1',
      PYTHONIOENCODING: 'utf-8',
      PYTHONUNBUFFERED: '1',
      
      // 设置用户数据目录用于日志
      ELECTRON_USER_DATA: require('electron').app.getPath('userData')
    };
    
    if (isUsingEmbedded) {
      // 使用嵌入式Python时的完整隔离环境
      const pythonHome = path.dirname(path.dirname(embeddedPythonPath));
      const sitePackages = path.join(pythonHome, 'lib', 'python3.11', 'site-packages');
      
      env.PYTHONHOME = pythonHome;
      env.PYTHONPATH = sitePackages;
      env.LD_LIBRARY_PATH = path.join(pythonHome, 'lib');
      env.DYLD_LIBRARY_PATH = path.join(pythonHome, 'lib'); // macOS
      
      // 只在首次构建或环境变化时记录日志
      if (!this._cachedPythonEnv || this._lastEmbeddedCheck !== isUsingEmbedded) {
        this.logger.info && this.logger.info('构建嵌入式Python环境变量', {
          PYTHONHOME: env.PYTHONHOME,
          PYTHONPATH: env.PYTHONPATH,
          LD_LIBRARY_PATH: env.LD_LIBRARY_PATH,
          DYLD_LIBRARY_PATH: env.DYLD_LIBRARY_PATH,
          pythonExecutable: embeddedPythonPath
        });
      }
    } else {
      // 使用系统Python时，清除可能干扰的嵌入式Python环境变量
      // 不设置PYTHONHOME和PYTHONPATH，让系统Python使用自己的环境
      if (!this._cachedPythonEnv || this._lastEmbeddedCheck !== isUsingEmbedded) {
        this.logger.info && this.logger.info('构建系统Python环境变量', {
          note: '使用系统Python默认环境',
          pythonExecutable: this.pythonCmd || '未确定'
        });
      }
    }
    
    // 清除可能干扰的系统Python环境变量
    delete env.PYTHONUSERBASE;
    delete env.PYTHONSTARTUP;
    delete env.VIRTUAL_ENV;
    
    // 缓存结果
    this._cachedPythonEnv = env;
    this._lastEmbeddedCheck = isUsingEmbedded;
    
    return env;
  }

  findDamoRoot(startDir, depth = 0, maxDepth = 5) {
    // 添加深度限制，避免在深层目录结构中搜索过久
    if (depth > maxDepth || !fs.existsSync(startDir)) {
      return null;
    }

    try {
      const entries = fs.readdirSync(startDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(startDir, entry.name);
          
          if (entry.name === 'damo') {
            // 检查是否包含至少一个目标模型子目录
            try {
              const models = fs.readdirSync(fullPath);
              const hasExpectedModel = models.some(m =>
                m.startsWith('speech_paraformer-') ||
                m.startsWith('speech_fsmn_vad-') ||
                m.startsWith('punc_ct-transformer-')
              );
              if (hasExpectedModel) {
                return fullPath;
              }
            } catch (error) {
              // 忽略无法读取的目录
              this.logger.debug && this.logger.debug('无法读取目录:', fullPath, error.message);
            }
          }
          
          // 递归继续查找 - 修复：添加 this 关键字
          const found = this.findDamoRoot(fullPath, depth + 1, maxDepth);
          if (found) return found;
        }
      }
    } catch (error) {
      // 处理权限错误或其他文件系统错误
      this.logger.debug && this.logger.debug('搜索目录时出错:', startDir, error.message);
    }
    
    return null;
  }

  /**
   * 获取模型缓存路径
   */
  getModelCachePath() {
    const baseCachePath =
      process.env.MODELSCOPE_CACHE || path.join(os.homedir(), '.cache', 'modelscope');

    // 可能的候选路径 - 添加 hub/models/damo 路径
    const candidates = [
      path.join(baseCachePath, 'damo'),
      path.join(baseCachePath, 'hub', 'damo'),
      path.join(baseCachePath, 'hub', 'models', 'damo'),  // 新增：支持 hub/models/damo 结构
      path.join(baseCachePath, 'models', 'damo'),
    ];

    // 先检查常见路径
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        this.logger.info && this.logger.info('找到模型缓存路径:', candidate);
        return candidate;
      }
    }

    // 如果没找到，则递归搜索 - 修复：添加 this 关键字
    this.logger.info && this.logger.info('常见路径未找到，开始递归搜索:', baseCachePath);
    const found = this.findDamoRoot(baseCachePath);
    if (found) {
      this.logger.info && this.logger.info('递归搜索找到模型路径:', found);
      return found;
    }

    throw new Error(`未找到有效的 damo 模型目录，请检查 MODELSCOPE_CACHE 或模型安装路径`);
  }


  async checkModelFiles() {
    /**
     * 检查所有模型文件是否存在（使用简单缓存避免频繁检查）
     */
    const now = Date.now();
    
    // 使用全局缓存避免频繁检查，但如果服务器状态可能已变化则强制检查
    if (globalModelCheckCache &&
        (now - globalModelCheckTime) < GLOBAL_CACHE_TIME &&
        !this.serverReady) { // 如果服务器已就绪，允许重新检查
      return globalModelCheckCache;
    }
    
    try {
      const cachePath = this.getModelCachePath();
      this.logger.info && this.logger.info('检查模型缓存路径:', cachePath);
      
      if (!fs.existsSync(cachePath)) {
        this.logger.info && this.logger.info('模型缓存目录不存在');
        this.modelsDownloaded = false;
        const result = {
          success: true,
          models_downloaded: false,
          missing_models: ["asr", "vad", "punc"],
          details: {}
        };
        
        // 更新全局缓存
        globalModelCheckCache = result;
        globalModelCheckTime = now;
        return result;
      }
      
      const results = {};
      const missingModels = [];
      
      for (const [modelType, config] of Object.entries(this.modelConfigs)) {
        const modelDir = path.join(cachePath, config.cache_path);
        const modelFile = path.join(modelDir, "model.pt");
        
        if (fs.existsSync(modelFile)) {
          const stats = fs.statSync(modelFile);
          const fileSize = stats.size;
          const isComplete = fileSize >= config.expected_size * 0.95; // 允许5%误差
          
          results[modelType] = {
            exists: true,
            path: modelFile,
            size: fileSize,
            expected_size: config.expected_size,
            complete: isComplete
          };
          
          if (!isComplete) {
            missingModels.push(modelType);
          }
        } else {
          results[modelType] = {
            exists: false,
            path: modelFile,
            size: 0,
            expected_size: config.expected_size,
            complete: false
          };
          missingModels.push(modelType);
        }
      }
      
      const allDownloaded = missingModels.length === 0;
      this.modelsDownloaded = allDownloaded;
      
      this.logger.info && this.logger.info('模型检查完成:', {
        allDownloaded,
        missingModels,
        details: results
      });
      
      const result = {
        success: true,
        models_downloaded: allDownloaded,
        missing_models: missingModels,
        details: results
      };
      
      // 更新全局缓存
      globalModelCheckCache = result;
      globalModelCheckTime = now;
      return result;
      
    } catch (error) {
      this.logger.error && this.logger.error('检查模型文件失败:', error);
      this.modelsDownloaded = false;
      const result = {
        success: false,
        error: error.message,
        models_downloaded: false,
        missing_models: ["asr", "vad", "punc"],
        details: {}
      };
      
      // 错误情况下不缓存，允许重试
      return result;
    }
  }

  async getDownloadProgress() {
    /**
     * 获取模型下载进度
     */
    try {
      const cachePath = this.getModelCachePath();
      
      if (!fs.existsSync(cachePath)) {
        return {
          success: true,
          overall_progress: 0,
          models: {
            "asr": { progress: 0, downloaded: 0, total: this.modelConfigs.asr.expected_size },
            "vad": { progress: 0, downloaded: 0, total: this.modelConfigs.vad.expected_size },
            "punc": { progress: 0, downloaded: 0, total: this.modelConfigs.punc.expected_size }
          }
        };
      }
      
      const totalExpected = Object.values(this.modelConfigs).reduce((sum, config) => sum + config.expected_size, 0);
      let totalDownloaded = 0;
      const modelProgress = {};
      
      for (const [modelType, config] of Object.entries(this.modelConfigs)) {
        const modelDir = path.join(cachePath, config.cache_path);
        const modelFile = path.join(modelDir, "model.pt");
        
        let fileSize = 0;
        if (fs.existsSync(modelFile)) {
          const stats = fs.statSync(modelFile);
          fileSize = stats.size;
          totalDownloaded += fileSize;
        }
        
        const progress = Math.min(100, (fileSize / config.expected_size) * 100);
        
        modelProgress[modelType] = {
          progress: Math.round(progress * 10) / 10, // 保留1位小数
          downloaded: fileSize,
          total: config.expected_size
        };
      }
      
      const overallProgress = Math.min(100, (totalDownloaded / totalExpected) * 100);
      
      return {
        success: true,
        overall_progress: Math.round(overallProgress * 10) / 10,
        models: modelProgress
      };
      
    } catch (error) {
      this.logger.error && this.logger.error('获取下载进度失败:', error);
      return {
        success: false,
        error: error.message,
        overall_progress: 0,
        models: {}
      };
    }
  }

  getDownloadScriptPath() {
    /**
     * 获取下载脚本路径
     */
    if (process.env.NODE_ENV === "development") {
      return path.join(__dirname, "..", "..", "download_models.py");
    } else {
      return path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "download_models.py"
      );
    }
  }

  async downloadModels(progressCallback = null) {
    /**
     * 下载模型文件（使用独立的Python脚本并行下载）
     */
    try {
      this.logger.info && this.logger.info('开始下载FunASR模型...');
      
      // 先检查模型状态
      const checkResult = await this.checkModelFiles();
      if (checkResult.models_downloaded) {
        this.logger.info && this.logger.info('模型已存在，无需下载');
        return { success: true, message: "模型已存在，无需下载" };
      }
      
      const pythonCmd = await this.findPythonExecutable();
      const scriptPath = this.getDownloadScriptPath();
      
      this.logger.info && this.logger.info('启动模型下载脚本:', {
        pythonCmd,
        scriptPath,
        scriptExists: fs.existsSync(scriptPath)
      });
      
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`下载脚本未找到: ${scriptPath}`);
      }
      
      return new Promise((resolve, reject) => {
        // 确保使用正确的Python环境
        const pythonEnv = this.buildPythonEnvironment();
        
        const downloadProcess = spawn(pythonCmd, [scriptPath], {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          env: pythonEnv
        });
        
        let hasError = false;
        
        downloadProcess.stdout.on("data", (data) => {
          const lines = data.toString().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const result = JSON.parse(line);
              
              if (result.error) {
                hasError = true;
                reject(new Error(result.error));
                return;
              }
              
              // 处理进度更新
              if (result.stage && progressCallback) {
                progressCallback({
                  stage: result.stage,
                  model: result.model,
                  progress: result.progress,
                  overall_progress: result.overall_progress,
                  completed: result.completed,
                  total: result.total
                });
              }
              
              // 处理最终结果
              if (result.success !== undefined) {
                if (result.success) {
                  this.modelsDownloaded = true;
                  resolve({ success: true, message: result.message || "模型下载完成" });
                } else {
                  hasError = true;
                  reject(new Error(result.error || "模型下载失败"));
                }
                return;
              }
              
            } catch (parseError) {
              // 忽略非JSON输出
              this.logger.debug && this.logger.debug('下载脚本非JSON输出:', line);
            }
          }
        });
        
        downloadProcess.stderr.on("data", (data) => {
          const errorOutput = data.toString();
          this.logger.error && this.logger.error('模型下载错误输出:', errorOutput);
        });
        
        downloadProcess.on("close", (code) => {
          if (!hasError) {
            if (code === 0) {
              this.modelsDownloaded = true;
              resolve({ success: true, message: "模型下载完成" });
            } else {
              reject(new Error(`模型下载进程退出，代码: ${code}`));
            }
          }
        });
        
        downloadProcess.on("error", (error) => {
          if (!hasError) {
            reject(new Error(`启动下载进程失败: ${error.message}`));
          }
        });
        
        // 设置超时（30分钟）
        setTimeout(() => {
          if (!hasError) {
            downloadProcess.kill();
            reject(new Error('模型下载超时'));
          }
        }, 30 * 60 * 1000);
      });
      
    } catch (error) {
      this.logger.error && this.logger.error('模型下载失败:', error);
      throw error;
    }
  }

  async restartServer() {
    /**
     * 重启FunASR服务器（用于模型下载完成后）
     */
    try {
      this.logger.info && this.logger.info('重启FunASR服务器...');
      
      // 停止现有服务器
      if (this.serverProcess) {
        await this._stopFunASRServer();
        this.logger.info && this.logger.info('已停止现有FunASR服务器');
      }
      
      // 重置状态并清除缓存
      this.serverReady = false;
      this.modelsInitialized = false;
      this.initializationPromise = null;
      this._clearModelCache();
      
      // 检查模型文件状态
      const modelStatus = await this.checkModelFiles();
      if (!modelStatus.models_downloaded) {
        throw new Error('模型文件未下载，无法启动服务器');
      }
      
      // 重新启动服务器
      this.initializationPromise = this._startFunASRServer();
      await this.initializationPromise;
      
      this.logger.info && this.logger.info('FunASR服务器重启完成');
      return { success: true, message: 'FunASR服务器重启成功' };
      
    } catch (error) {
      this.logger.error && this.logger.error('重启FunASR服务器失败:', error);
      return { success: false, error: error.message };
    }
  }

  _clearModelCache() {
    /**
     * 清除模型检查缓存
     */
    globalModelCheckCache = null;
    globalModelCheckTime = 0;
  }

  async initializeAtStartup() {
    try {
      this.logger.info && this.logger.info('FunASR管理器启动初始化开始');
      
      const pythonCmd = await this.findPythonExecutable();
      this.logger.info && this.logger.info('Python可执行文件找到', { pythonCmd });
      
      const funasrStatus = await this.checkFunASRInstallation();
      this.logger.info && this.logger.info('FunASR安装状态检查完成', funasrStatus);
      
      this.isInitialized = true;
      
      // 预初始化模型（异步进行，不阻塞启动）
      this.preInitializeModels();
      this.logger.info && this.logger.info('FunASR管理器启动初始化完成');
    } catch (error) {
      // FunASR 在启动时不可用不是关键问题
      this.logger.warn && this.logger.warn('FunASR启动初始化失败，但不影响应用启动', error);
      this.isInitialized = true;
    }
  }

  async preInitializeModels() {
    // 如果已经在初始化或已完成，直接返回
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._startFunASRServer();
    return this.initializationPromise;
  }

  async _startFunASRServer() {
    try {
      this.logger.info && this.logger.info('启动FunASR服务器...');
      
      const status = await this.checkFunASRInstallation();
      if (!status.installed) {
        this.logger.warn && this.logger.warn('FunASR未安装，跳过服务器启动');
        return;
      }

      const pythonCmd = await this.findPythonExecutable();
      const serverPath = this.getFunASRServerPath();
      this.logger.info && this.logger.info('FunASR服务器配置', {
        pythonCmd,
        serverPath,
        serverExists: fs.existsSync(serverPath)
      });
      
      if (!fs.existsSync(serverPath)) {
        this.logger.error && this.logger.error('FunASR服务器脚本未找到，跳过服务器启动', { serverPath });
        return;
      }

      // 确保环境变量正确设置
      this.setupIsolatedEnvironment();
      
      // 构建完整的环境变量
      const pythonEnv = this.buildPythonEnvironment();

      return new Promise((resolve) => {
        this.logger.info && this.logger.info('启动FunASR Python进程', {
          command: pythonCmd,
          args: [serverPath],
          env: pythonEnv
        });
        const cachePath = this.getModelCachePath();
        // this.serverProcess = spawn(pythonCmd, [serverPath], {
        //   stdio: ["pipe", "pipe", "pipe"],
        //   windowsHide: true,
        //   env: pythonEnv // 使用完整的Python环境变量
        // });

        this.serverProcess = spawn(
          pythonCmd,
          [serverPath, "--damo-root", cachePath],   // <== 这里加上参数
          {
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
            env: pythonEnv // 保持你原来的 Python 环境
          }
        );

        let initResponseReceived = false;

        this.serverProcess.stdout.on("data", (data) => {
          const lines = data.toString().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            this.logger.debug && this.logger.debug('FunASR服务器输出', { line });
            try {
              const result = JSON.parse(line);
              
              if (!initResponseReceived) {
                // 这是初始化响应
                initResponseReceived = true;
                if (result.success) {
                  this.serverReady = true;
                  this.modelsInitialized = true;
                  this._clearModelCache(); // 清除缓存，确保状态更新
                  this.logger.info && this.logger.info('FunASR服务器启动成功，模型已初始化');
                } else {
                  this.logger.error && this.logger.error('FunASR服务器初始化失败', result);
                }
                resolve();
              }
            } catch (parseError) {
              // 忽略非JSON输出，但记录到日志
              this.logger.debug && this.logger.debug('FunASR服务器非JSON输出', { line });
            }
          }
        });

        this.serverProcess.stderr.on("data", (data) => {
          const errorOutput = data.toString();
          this.logger.error && this.logger.error('FunASR服务器错误输出', { errorOutput });
          // 同时记录到FunASR专用日志
          if (this.logger.logFunASR) {
            this.logger.logFunASR('error', 'Python stderr', { errorOutput });
          }
        });

        this.serverProcess.on("close", (code) => {
          this.logger.warn && this.logger.warn('FunASR服务器进程退出', { code });
          this.serverProcess = null;
          this.serverReady = false;
          this.modelsInitialized = false;
          
          if (!initResponseReceived) {
            resolve();
          }
        });

        this.serverProcess.on("error", (error) => {
          this.logger.error && this.logger.error('FunASR服务器进程错误', error);
          this.serverProcess = null;
          this.serverReady = false;
          
          if (!initResponseReceived) {
            resolve();
          }
        });

        // 设置超时
        setTimeout(() => {
          if (!initResponseReceived) {
            this.logger.warn && this.logger.warn('FunASR服务器启动超时');
            if (this.serverProcess) {
              this.serverProcess.kill();
            }
            resolve();
          }
        }, 120000); // 2分钟超时
      });
    } catch (error) {
      this.logger.error && this.logger.error('启动FunASR服务器异常', error);
    }
  }

  async _sendServerCommand(command) {
    if (!this.serverProcess || !this.serverReady) {
      throw new Error('FunASR服务器未就绪');
    }

    return new Promise((resolve, reject) => {
      let responseReceived = false;
      
      const onData = (data) => {
        if (responseReceived) return;
        
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const result = JSON.parse(line);
            responseReceived = true;
            this.serverProcess.stdout.removeListener('data', onData);
            resolve(result);
            return;
          } catch (parseError) {
            // 忽略非JSON输出
          }
        }
      };

      this.serverProcess.stdout.on('data', onData);
      
      // 发送命令
      this.serverProcess.stdin.write(JSON.stringify(command) + '\n');
      
      // 设置超时
      setTimeout(() => {
        if (!responseReceived) {
          responseReceived = true;
          this.serverProcess.stdout.removeListener('data', onData);
          reject(new Error('服务器响应超时'));
        }
      }, 60000); // 1分钟超时
    });
  }

  async _stopFunASRServer() {
    if (this.serverProcess) {
      try {
        // 发送退出命令
        await this._sendServerCommand({ action: 'exit' });
      } catch (error) {
        // 如果发送退出命令失败，直接杀死进程
        this.serverProcess.kill();
      }
      
      this.serverProcess = null;
      this.serverReady = false;
      this.modelsInitialized = false;
    }
  }

  async findPythonExecutable() {
    // 如果有缓存结果则返回
    if (this.pythonCmd) {
      return this.pythonCmd;
    }

    // 优先使用嵌入式Python（完全隔离策略）
    const embeddedPython = this.getEmbeddedPythonPath();
    
    this.logger.info && this.logger.info('检查嵌入式Python', {
      path: embeddedPython,
      exists: fs.existsSync(embeddedPython)
    });

    if (fs.existsSync(embeddedPython)) {
      try {
        // 设置隔离环境
        this.setupIsolatedEnvironment();
        
        // 验证嵌入式Python是否可用
        const version = await this.getPythonVersion(embeddedPython);
        if (this.isPythonVersionSupported(version)) {
          this.pythonCmd = embeddedPython;
          this.logger.info && this.logger.info('使用嵌入式Python', {
            path: embeddedPython,
            version: `${version.major}.${version.minor}`
          });
          return embeddedPython;
        }
      } catch (error) {
        this.logger.warn && this.logger.warn('嵌入式Python不可用', error);
      }
    }

    // 如果嵌入式Python不可用，在开发模式下回退到系统Python
    if (process.env.NODE_ENV === "development") {
      this.logger.warn && this.logger.warn('开发模式：回退到系统Python');
      return await this.findPythonExecutableWithFallback();
    }

    // 生产模式下不回退，确保完全隔离
    throw new Error(
      "嵌入式Python环境不可用。请重新安装应用或运行构建脚本准备Python环境。"
    );
  }

  async findPythonExecutableWithFallback() {
    // 保留原有的查找逻辑作为开发时的回退方案
    const projectRoot = path.join(__dirname, "..", "..");
      
    const possiblePaths = [
      // 优先使用 uv 虚拟环境中的 Python
      path.join(projectRoot, ".venv", "bin", "python3.11"),
      path.join(projectRoot, ".venv", "bin", "python3"),
      path.join(projectRoot, ".venv", "bin", "python"),
      // 然后尝试系统路径
      "python3.11",
      "python3",
      "python",
      "/usr/bin/python3.11",
      "/usr/bin/python3",
      "/usr/local/bin/python3.11",
      "/usr/local/bin/python3",
      "/opt/homebrew/bin/python3.11",
      "/opt/homebrew/bin/python3",
      "/usr/bin/python",
      "/usr/local/bin/python",
    ];

    for (const pythonPath of possiblePaths) {
      try {
        const version = await this.getPythonVersion(pythonPath);
        if (this.isPythonVersionSupported(version)) {
          this.pythonCmd = pythonPath;
          return pythonPath;
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error(
      "未找到 Python 3.x。使用 installPython() 自动安装。"
    );
  }

  async getPythonVersion(pythonPath) {
    return new Promise((resolve) => {
      // 如果是嵌入式Python，使用完整的环境变量
      const isEmbedded = pythonPath === this.getEmbeddedPythonPath();
      const env = isEmbedded ? this.buildPythonEnvironment() : process.env;
      
      const testProcess = spawn(pythonPath, ["--version"], {
        env: env
      });
      let output = "";
      
      testProcess.stdout.on("data", (data) => output += data);
      testProcess.stderr.on("data", (data) => output += data);
      
      testProcess.on("close", (code) => {
        if (code === 0) {
          const match = output.match(/Python (\d+)\.(\d+)/i);
          resolve(match ? { major: +match[1], minor: +match[2] } : null);
        } else {
          resolve(null);
        }
      });
      
      testProcess.on("error", () => resolve(null));
    });
  }

  isPythonVersionSupported(version) {
    // 接受任何 Python 3.x 版本
    return version && version.major === 3;
  }

  async installPython(progressCallback = null) {
    try {
      // 清除缓存的 Python 命令，因为我们正在安装新的
      this.pythonCmd = null;
      
      const result = await this.pythonInstaller.installPython(progressCallback);
      
      // 安装后，尝试重新找到 Python
      try {
        await this.findPythonExecutable();
        return result;
      } catch (findError) {
        throw new Error("Python 已安装但在 PATH 中未找到。请重启应用程序。");
      }
      
    } catch (error) {
      this.logger.error && this.logger.error("Python 安装失败:", error);
      throw error;
    }
  }

  async checkPythonInstallation() {
    return await this.pythonInstaller.isPythonInstalled();
  }

  async checkFunASRInstallation() {
    // 如果有缓存结果则返回
    if (this.funasrInstalled !== null) {
      return this.funasrInstalled;
    }

    try {
      const pythonCmd = await this.findPythonExecutable();

      const result = await new Promise((resolve) => {
        // 确保使用正确的Python环境
        const pythonEnv = this.buildPythonEnvironment();
        
        const checkProcess = spawn(pythonCmd, [
          "-c",
          'import funasr; print("OK")',
        ], {
          env: pythonEnv
        });

        let output = "";
        let errorOutput = "";
        
        checkProcess.stdout.on("data", (data) => {
          output += data.toString();
        });
        
        checkProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
        });

        checkProcess.on("close", (code) => {
          if (code === 0 && output.includes("OK")) {
            resolve({ installed: true, working: true });
          } else {
            this.logger.error && this.logger.error('FunASR检查失败', {
              code,
              output,
              errorOutput
            });
            resolve({ installed: false, working: false, error: errorOutput || output });
          }
        });

        checkProcess.on("error", (error) => {
          resolve({ installed: false, working: false, error: error.message });
        });
      });

      this.funasrInstalled = result; // 缓存结果
      return result;
    } catch (error) {
      const errorResult = {
        installed: false,
        working: false,
        error: error.message,
      };
      this.funasrInstalled = errorResult;
      return errorResult;
    }
  }

  async upgradePip(pythonCmd) {
    return runCommand(pythonCmd, ["-m", "pip", "install", "--upgrade", "pip"], { timeout: TIMEOUTS.PIP_UPGRADE });
  }

  async installFunASR(progressCallback = null) {
    const pythonCmd = await this.findPythonExecutable();
    
    if (progressCallback) {
      progressCallback({ stage: "升级 pip...", percentage: 10 });
    }
    
    // 首先升级 pip 以避免版本问题
    try {
      await this.upgradePip(pythonCmd);
    } catch (error) {
      this.logger.warn && this.logger.warn("第一次 pip 升级尝试失败:", error.message);
      
      // 尝试用户安装方式升级 pip
      try {
        await runCommand(pythonCmd, ["-m", "pip", "install", "--user", "--upgrade", "pip"], { timeout: TIMEOUTS.PIP_UPGRADE });
      } catch (userError) {
        this.logger.warn && this.logger.warn("pip 升级完全失败，尝试继续");
      }
    }
    
    if (progressCallback) {
      progressCallback({ stage: "安装 FunASR...", percentage: 30 });
    }
    
    // 安装 FunASR 和相关依赖
    try {
      // 首先尝试常规安装
      await runCommand(pythonCmd, ["-m", "pip", "install", "-U", "funasr"], { timeout: TIMEOUTS.DOWNLOAD });
      
      if (progressCallback) {
        progressCallback({ stage: "安装 librosa...", percentage: 60 });
      }
      
      // 安装 librosa（音频处理库）
      await runCommand(pythonCmd, ["-m", "pip", "install", "-U", "librosa"], { timeout: TIMEOUTS.DOWNLOAD });
      
      if (progressCallback) {
        progressCallback({ stage: "安装完成！", percentage: 100 });
      }
      
      // 清除缓存状态
      this.funasrInstalled = null;
      
      return { success: true, message: "FunASR 安装成功" };
      
    } catch (error) {
      if (error.message.includes("Permission denied") || error.message.includes("access is denied")) {
        // 使用用户安装方式重试
        try {
          await runCommand(pythonCmd, ["-m", "pip", "install", "--user", "-U", "funasr"], { timeout: TIMEOUTS.DOWNLOAD });
          await runCommand(pythonCmd, ["-m", "pip", "install", "--user", "-U", "librosa"], { timeout: TIMEOUTS.DOWNLOAD });
          
          if (progressCallback) {
            progressCallback({ stage: "安装完成！", percentage: 100 });
          }
          
          this.funasrInstalled = null;
          return { success: true, message: "FunASR 安装成功（用户模式）" };
        } catch (userError) {
          throw new Error(`FunASR 安装失败: ${userError.message}`);
        }
      }
      
      // 增强常见问题的错误消息
      let message = error.message;
      if (message.includes("Microsoft Visual C++")) {
        message = "需要 Microsoft Visual C++ 构建工具。请安装 Visual Studio Build Tools。";
      } else if (message.includes("No matching distribution")) {
        message = "Python 版本不兼容。FunASR 需要 Python 3.8-3.11。";
      }
      
      throw new Error(message);
    }
  }

  async transcribeAudio(audioBlob, options = {}) {
    // 检查 FunASR 是否已安装
    const status = await this.checkFunASRInstallation();
    if (!status.installed) {
      throw new Error("FunASR 未安装。请先安装 FunASR。");
    }

    // 如果服务器还未就绪，等待初始化完成
    if (!this.serverReady && this.initializationPromise) {
      this.logger.info && this.logger.info('等待FunASR服务器就绪...');
      await this.initializationPromise;
    }

    const tempAudioPath = await this.createTempAudioFile(audioBlob);
    
    try {
      if (!this.serverReady) {
        throw new Error('FunASR服务器未就绪，请稍后重试');
      }
      
      // 使用服务器模式
      this.logger.info && this.logger.info('使用FunASR服务器模式进行转录');
      const result = await this._sendServerCommand({
        action: 'transcribe',
        audio_path: tempAudioPath,
        options: options
      });
      
      if (!result.success) {
        throw new Error(result.error || '转录失败');
      }
      
      return {
        success: true,
        text: result.text.trim(),
        raw_text: result.raw_text,
        confidence: result.confidence || 0.0,
        language: result.language || "zh-CN"
      };
    } catch (error) {
      throw error;
    } finally {
      await this.cleanupTempFile(tempAudioPath);
    }
  }

  async createTempAudioFile(audioBlob) {
    const tempDir = os.tmpdir();
    const filename = `funasr_audio_${crypto.randomUUID()}.wav`;
    const tempAudioPath = path.join(tempDir, filename);
    
    this.logger.info && this.logger.info('创建临时文件:', tempAudioPath);

    let buffer;
    if (audioBlob instanceof ArrayBuffer) {
      buffer = Buffer.from(audioBlob);
    } else if (audioBlob instanceof Uint8Array) {
      buffer = Buffer.from(audioBlob);
    } else if (typeof audioBlob === "string") {
      buffer = Buffer.from(audioBlob, "base64");
    } else if (audioBlob && audioBlob.buffer) {
      buffer = Buffer.from(audioBlob.buffer);
    } else {
      throw new Error(`不支持的音频数据类型: ${typeof audioBlob}`);
    }
    
    this.logger.debug && this.logger.debug('缓冲区创建，大小:', buffer.length);

    await fs.promises.writeFile(tempAudioPath, buffer);
    
    // 验证文件是否正确写入
    const stats = await fs.promises.stat(tempAudioPath);
    this.logger.info && this.logger.info('临时音频文件创建:', {
      path: tempAudioPath,
      size: stats.size,
      isFile: stats.isFile()
    });
    
    if (stats.size === 0) {
      throw new Error("音频文件为空");
    }
    
    return tempAudioPath;
  }


  async cleanupTempFile(tempAudioPath) {
    try {
      await fs.promises.unlink(tempAudioPath);
    } catch (cleanupError) {
      // 临时文件清理错误不是关键问题
    }
  }

  async checkStatus() {
    try {
      if (this.serverReady) {
        return await this._sendServerCommand({ action: 'status' });
      } else {
        // 检查FunASR是否已安装
        const installStatus = await this.checkFunASRInstallation();
        const modelStatus = await this.checkModelFiles();
        
        let error = "FunASR未安装";
        if (installStatus.installed) {
          if (!modelStatus.models_downloaded) {
            error = "模型文件未下载，请先下载模型";
          } else {
            error = "FunASR服务器正在启动中...";
          }
        }
        
        return {
          success: installStatus.installed && modelStatus.models_downloaded,
          error: error,
          installed: installStatus.installed,
          models_downloaded: modelStatus.models_downloaded,
          missing_models: modelStatus.missing_models || [],
          initializing: this.initializationPromise !== null
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        installed: false,
        models_downloaded: false
      };
    }
  }
}

module.exports = FunASRManager;