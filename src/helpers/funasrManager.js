const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const PythonInstaller = require("./pythonInstaller");
const { runCommand, TIMEOUTS } = require("../utils/process");

class FunASRManager {
  constructor() {
    this.pythonCmd = null; // 缓存 Python 可执行文件路径
    this.funasrInstalled = null; // 缓存安装状态
    this.isInitialized = false; // 跟踪启动初始化是否完成
    this.pythonInstaller = new PythonInstaller();
    this.modelsInitialized = false; // 跟踪模型是否已初始化
    this.initializationPromise = null; // 缓存初始化Promise
    this.serverProcess = null; // FunASR服务器进程
    this.serverReady = false; // 服务器是否就绪
  }

  getFunASRScriptPath() {
    // 在生产环境中，文件从 ASAR 中解包
    if (process.env.NODE_ENV === "development") {
      return path.join(__dirname, "..", "..", "funasr_bridge.py");
    } else {
      // 在生产环境中，使用解包路径
      return path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "funasr_bridge.py"
      );
    }
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

  async initializeAtStartup() {
    try {
      await this.findPythonExecutable();
      await this.checkFunASRInstallation();
      this.isInitialized = true;
      
      // 预初始化模型（异步进行，不阻塞启动）
      this.preInitializeModels();
    } catch (error) {
      // FunASR 在启动时不可用不是关键问题
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
      console.log('启动FunASR服务器...');
      
      const status = await this.checkFunASRInstallation();
      if (!status.installed) {
        console.log('FunASR未安装，跳过服务器启动');
        return;
      }

      const pythonCmd = await this.findPythonExecutable();
      const serverPath = this.getFunASRServerPath();
      
      if (!fs.existsSync(serverPath)) {
        console.log('FunASR服务器脚本未找到，跳过服务器启动');
        return;
      }

      return new Promise((resolve) => {
        this.serverProcess = spawn(pythonCmd, [serverPath], {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });

        let initResponseReceived = false;

        this.serverProcess.stdout.on("data", (data) => {
          const lines = data.toString().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const result = JSON.parse(line);
              
              if (!initResponseReceived) {
                // 这是初始化响应
                initResponseReceived = true;
                if (result.success) {
                  this.serverReady = true;
                  this.modelsInitialized = true;
                  console.log('FunASR服务器启动成功，模型已初始化');
                } else {
                  console.log('FunASR服务器初始化失败:', result.error);
                }
                resolve();
              }
            } catch (parseError) {
              // 忽略非JSON输出
            }
          }
        });

        this.serverProcess.stderr.on("data", (data) => {
          console.log('FunASR服务器错误输出:', data.toString());
        });

        this.serverProcess.on("close", (code) => {
          console.log('FunASR服务器进程退出，代码:', code);
          this.serverProcess = null;
          this.serverReady = false;
          this.modelsInitialized = false;
          
          if (!initResponseReceived) {
            resolve();
          }
        });

        this.serverProcess.on("error", (error) => {
          console.log('FunASR服务器进程错误:', error.message);
          this.serverProcess = null;
          this.serverReady = false;
          
          if (!initResponseReceived) {
            resolve();
          }
        });

        // 设置超时
        setTimeout(() => {
          if (!initResponseReceived) {
            console.log('FunASR服务器启动超时');
            if (this.serverProcess) {
              this.serverProcess.kill();
            }
            resolve();
          }
        }, 120000); // 2分钟超时
      });
    } catch (error) {
      console.log('启动FunASR服务器异常:', error.message);
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

    const possiblePaths = [
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
          this.pythonCmd = pythonPath; // 缓存结果
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
      const testProcess = spawn(pythonPath, ["--version"]);
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
      console.error("Python 安装失败:", error);
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
        const checkProcess = spawn(pythonCmd, [
          "-c",
          'import funasr; print("OK")',
        ]);

        let output = "";
        checkProcess.stdout.on("data", (data) => {
          output += data.toString();
        });

        checkProcess.on("close", (code) => {
          if (code === 0 && output.includes("OK")) {
            resolve({ installed: true, working: true });
          } else {
            resolve({ installed: false, working: false });
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
      console.log("第一次 pip 升级尝试失败:", error.message);
      
      // 尝试用户安装方式升级 pip
      try {
        await runCommand(pythonCmd, ["-m", "pip", "install", "--user", "--upgrade", "pip"], { timeout: TIMEOUTS.PIP_UPGRADE });
      } catch (userError) {
        console.log("pip 升级完全失败，尝试继续");
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
      console.log('等待FunASR服务器就绪...');
      await this.initializationPromise;
    }

    const tempAudioPath = await this.createTempAudioFile(audioBlob);
    
    try {
      let result;
      
      if (this.serverReady) {
        // 使用服务器模式
        console.log('使用FunASR服务器模式进行转录');
        result = await this._sendServerCommand({
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
      } else {
        // 回退到原始模式
        console.log('回退到FunASR进程模式进行转录');
        const stdout = await this.runFunASRProcess(tempAudioPath, options);
        return this.parseFunASRResult(stdout);
      }
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
    
    console.log('创建临时文件:', tempAudioPath);

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
    
    console.log('缓冲区创建，大小:', buffer.length);

    await fs.promises.writeFile(tempAudioPath, buffer);
    
    // 验证文件是否正确写入
    const stats = await fs.promises.stat(tempAudioPath);
    console.log('临时音频文件创建:', {
      path: tempAudioPath,
      size: stats.size,
      isFile: stats.isFile()
    });
    
    if (stats.size === 0) {
      throw new Error("音频文件为空");
    }
    
    return tempAudioPath;
  }

  async runFunASRProcess(tempAudioPath, options) {
    const pythonCmd = await this.findPythonExecutable();
    const funasrScriptPath = this.getFunASRScriptPath();
    
    // 检查 FunASR 脚本是否存在
    if (!fs.existsSync(funasrScriptPath)) {
      throw new Error(`FunASR 脚本未找到: ${funasrScriptPath}`);
    }
    
    const args = [funasrScriptPath, "transcribe", "--audio", tempAudioPath];
    
    // 添加选项
    if (options) {
      args.push("--options", JSON.stringify(options));
    }

    return new Promise((resolve, reject) => {
      const funasrProcess = spawn(pythonCmd, args, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let isResolved = false;

      // 设置超时 - 如果模型已初始化，使用较短超时；否则使用长超时
      const timeoutDuration = this.modelsInitialized ? 60000 : 600000; // 1分钟或10分钟
      const timeout = setTimeout(() => {
        if (!isResolved) {
          funasrProcess.kill("SIGTERM");
          const timeoutMsg = this.modelsInitialized
            ? "FunASR 转录超时 (1 分钟)"
            : "FunASR 转录超时 (10 分钟) - 可能是首次下载模型导致，请稍后重试";
          reject(new Error(timeoutMsg));
        }
      }, timeoutDuration);

      funasrProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      funasrProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      funasrProcess.on("close", (code) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeout);

        console.log('FunASR 进程关闭:', {
          code,
          stdoutLength: stdout.length,
          stderrLength: stderr.length
        });

        if (code === 0) {
          resolve(stdout);
        } else {
          // 提供更详细的错误信息
          let errorMsg = `FunASR 转录失败 (代码 ${code})`;
          if (stderr.includes("ModuleNotFoundError")) {
            errorMsg = "FunASR 模块未找到，请检查安装";
          } else if (stderr.includes("CUDA") || stderr.includes("GPU")) {
            errorMsg = "GPU 相关错误，将使用 CPU 模式";
          } else if (stderr.includes("download") || stderr.includes("网络")) {
            errorMsg = "模型下载失败，请检查网络连接";
          } else if (stderr.includes("memory") || stderr.includes("内存")) {
            errorMsg = "内存不足，请关闭其他应用程序";
          }
          
          reject(new Error(`${errorMsg}: ${stderr.slice(0, 200)}...`));
        }
      });

      funasrProcess.on("error", (error) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeout);
        reject(new Error(`FunASR 进程错误: ${error.message}`));
      });
    });
  }

  parseFunASRResult(stdout) {
    console.log('解析结果，stdout 长度:', stdout.length);
    
    try {
      // 清理 stdout，移除任何非 JSON 内容
      const lines = stdout.split("\n").filter((line) => line.trim());
      console.log('FunASR 原始输出:', stdout);
      console.log('所有输出行:', lines);
      
      // 方法1: 查找单行JSON（以 { 开始，以 } 结束）
      let jsonLine = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          jsonLine = trimmed;
          break;
        }
      }

      // 方法2: 如果没有找到单行JSON，尝试解析多行JSON
      if (!jsonLine) {
        // 查找JSON开始和结束的位置
        let jsonStartIndex = -1;
        let jsonEndIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          if (trimmed === "{" && jsonStartIndex === -1) {
            jsonStartIndex = i;
          }
          if (trimmed === "}" && jsonStartIndex !== -1) {
            jsonEndIndex = i;
            break;
          }
        }
        
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
          // 合并JSON行
          const jsonLines = lines.slice(jsonStartIndex, jsonEndIndex + 1);
          jsonLine = jsonLines.join("");
        }
      }

      // 方法3: 如果还是没有找到，尝试查找包含关键字段的JSON片段
      if (!jsonLine) {
        // 查找包含 "success": true 的行附近的JSON
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('"success": true')) {
            // 向前和向后查找JSON边界
            let start = i;
            let end = i;
            
            // 向前查找 {
            while (start >= 0 && !lines[start].trim().startsWith("{")) {
              start--;
            }
            
            // 向后查找 }
            while (end < lines.length && !lines[end].trim().endsWith("}")) {
              end++;
            }
            
            if (start >= 0 && end < lines.length) {
              const jsonLines = lines.slice(start, end + 1);
              jsonLine = jsonLines.join("");
              break;
            }
          }
        }
      }

      if (!jsonLine) {
        throw new Error("FunASR 响应中未找到 JSON 输出");
      }

      const result = JSON.parse(jsonLine);
      
      if (!result.success) {
        return { success: false, message: result.error || "转录失败" };
      }
      
      if (!result.text || result.text.trim().length === 0) {
        return { success: false, message: "未检测到音频" };
      }
      
      return {
        success: true,
        text: result.text.trim(),
        raw_text: result.raw_text,
        confidence: result.confidence || 0.0,
        language: result.language || "zh-CN"
      };
    } catch (parseError) {
      console.error('解析 FunASR 输出失败:', parseError);
      throw new Error(`解析 FunASR 输出失败: ${parseError.message}`);
    }
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
      const pythonCmd = await this.findPythonExecutable();
      const funasrScriptPath = this.getFunASRScriptPath();
      
      const args = [funasrScriptPath, "status"];

      return new Promise((resolve, reject) => {
        const statusProcess = spawn(pythonCmd, args, {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        });

        let stdout = "";
        let stderr = "";

        statusProcess.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        statusProcess.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        statusProcess.on("close", (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout);
              resolve(result);
            } catch (parseError) {
              resolve({
                success: false,
                error: "解析状态结果失败",
                installed: false
              });
            }
          } else {
            resolve({
              success: false,
              error: stderr || "状态检查失败",
              installed: false
            });
          }
        });

        statusProcess.on("error", (error) => {
          resolve({
            success: false,
            error: error.message,
            installed: false
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error.message,
        installed: false
      };
    }
  }
}

module.exports = FunASRManager;