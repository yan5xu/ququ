const fs = require("fs");
const path = require("path");
const https = require("https");
const os = require("os");
const { runCommand, TIMEOUTS } = require("../utils/process");

class PythonInstaller {
  constructor(logger = null) {
    this.pythonVersion = "3.11.9"; // 与FunASR兼容的稳定版本
    this.logger = logger;
  }

  async downloadFile(url, outputPath, progressCallback = null) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`下载失败: HTTP ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (progressCallback && totalSize) {
            progressCallback({
              downloaded: downloadedSize,
              total: totalSize,
              percentage: Math.round((downloadedSize / totalSize) * 100)
            });
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (error) => {
          fs.unlink(outputPath, () => {}); // 错误时清理
          reject(error);
        });

      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  async installPythonMacOS(progressCallback = null) {
    const platform = process.arch === 'arm64' ? 'macos11' : 'macosx10.9';
    const installerUrl = `https://www.python.org/ftp/python/${this.pythonVersion}/python-${this.pythonVersion}-${platform}.pkg`;
    
    const tempDir = os.tmpdir();
    const installerPath = path.join(tempDir, `python-${this.pythonVersion}.pkg`);

    try {
      // 首先尝试使用 Homebrew（推荐方式）
      try {
        await runCommand("brew", ["--version"], { timeout: TIMEOUTS.QUICK_CHECK });
        if (this.logger && this.logger.info) {
          this.logger.info("通过 Homebrew 安装 Python...");
        }
        
        if (progressCallback) {
          progressCallback({ stage: "通过 Homebrew 安装 Python...", percentage: 25 });
        }
        
        await runCommand("brew", ["install", "python@3.11"], { timeout: TIMEOUTS.INSTALL });
        
        if (progressCallback) {
          progressCallback({ stage: "Python 安装完成！", percentage: 100 });
        }
        
        return { success: true, method: "homebrew" };
        
      } catch (brewError) {
        if (this.logger && this.logger.info) {
          this.logger.info("Homebrew 不可用，使用官方安装包...");
        }
        
        if (progressCallback) {
          progressCallback({ stage: "下载 Python 安装包...", percentage: 10 });
        }
        
        // 下载官方 Python 安装包
        await this.downloadFile(installerUrl, installerPath, (progress) => {
          if (progressCallback) {
            progressCallback({ 
              stage: `下载 Python 安装包... ${progress.percentage}%`, 
              percentage: 10 + (progress.percentage * 0.4) // 10-50%
            });
          }
        });

        if (progressCallback) {
          progressCallback({ stage: "安装 Python...", percentage: 60 });
        }

        // 静默安装 Python
        await runCommand("sudo", ["installer", "-pkg", installerPath, "-target", "/"], { timeout: TIMEOUTS.INSTALL });
        
        // 清理
        fs.unlink(installerPath, () => {});
        
        if (progressCallback) {
          progressCallback({ stage: "Python 安装完成！", percentage: 100 });
        }
        
        return { success: true, method: "official_installer" };
      }
      
    } catch (error) {
      // 错误时清理
      if (fs.existsSync(installerPath)) {
        fs.unlink(installerPath, () => {});
      }
      throw error;
    }
  }

  async checkWindowsAdmin() {
    try {
      // 尝试读取受保护的注册表项来检查管理员权限
      await runCommand('reg', ['query', 'HKU\\S-1-5-19'], { timeout: TIMEOUTS.QUICK_CHECK });
      return true;
    } catch (error) {
      return false;
    }
  }

  async installPythonWindows(progressCallback = null) {
    const arch = process.arch === 'ia32' ? '' : '-amd64';
    const installerUrl = `https://www.python.org/ftp/python/${this.pythonVersion}/python-${this.pythonVersion}${arch}.exe`;
    
    const tempDir = os.tmpdir();
    const installerPath = path.join(tempDir, `python-${this.pythonVersion}.exe`);

    try {
      // 检查管理员权限
      const isAdmin = await this.checkWindowsAdmin();
      
      if (progressCallback) {
        progressCallback({ stage: "下载 Python 安装包...", percentage: 10 });
      }
      
      // 下载 Python 安装包
      await this.downloadFile(installerUrl, installerPath, (progress) => {
        if (progressCallback) {
          progressCallback({ 
            stage: `下载 Python 安装包... ${progress.percentage}%`, 
            percentage: 10 + (progress.percentage * 0.4) // 10-50%
          });
        }
      });

      if (progressCallback) {
        progressCallback({ stage: "安装 Python...", percentage: 60 });
      }

      // 根据管理员权限使用适当的安装选项
      const installArgs = isAdmin ? [
        "/quiet",
        "InstallAllUsers=1",
        "PrependPath=1",
        "Include_test=0",
        "Include_doc=0",
        "Include_dev=0",
        "Include_debug=0",
        "Include_launcher=1",
        "InstallLauncherAllUsers=1"
      ] : [
        "/quiet",
        "InstallAllUsers=0",
        "PrependPath=1",
        "Include_test=0",
        "Include_doc=0",
        "Include_dev=0",
        "Include_debug=0",
        "Include_launcher=1",
        "InstallLauncherAllUsers=0",
        "DefaultJustForMeTargetDir=%LOCALAPPDATA%\\Programs\\Python\\Python311"
      ];

      await runCommand(installerPath, installArgs, { timeout: TIMEOUTS.INSTALL });
      
      // 清理
      fs.unlink(installerPath, () => {});
      
      if (progressCallback) {
        progressCallback({ stage: "Python 安装完成！", percentage: 100 });
      }
      
      return { success: true, method: "official_installer" };
      
    } catch (error) {
      // 错误时清理
      if (fs.existsSync(installerPath)) {
        fs.unlink(installerPath, () => {});
      }
      throw error;
    }
  }

  async installPythonLinux(progressCallback = null) {
    try {
      if (progressCallback) {
        progressCallback({ stage: "检测 Linux 发行版...", percentage: 10 });
      }
      
      // 检测包管理器并安装 Python
      try {
        // 尝试 apt (Debian/Ubuntu)
        await runCommand("apt", ["--version"], { timeout: TIMEOUTS.QUICK_CHECK });
        
        if (progressCallback) {
          progressCallback({ stage: "通过 apt 安装 Python...", percentage: 30 });
        }
        
        await runCommand("sudo", ["apt", "update"], { timeout: TIMEOUTS.PIP_UPGRADE });
        await runCommand("sudo", ["apt", "install", "-y", "python3.11", "python3.11-pip", "python3.11-dev"], { timeout: TIMEOUTS.INSTALL });
        
        if (progressCallback) {
          progressCallback({ stage: "Python 安装完成！", percentage: 100 });
        }
        
        return { success: true, method: "apt" };
        
      } catch (aptError) {
        try {
          // 尝试 yum (RHEL/CentOS/Fedora)
          await runCommand("yum", ["--version"], { timeout: TIMEOUTS.QUICK_CHECK });
          
          if (progressCallback) {
            progressCallback({ stage: "通过 yum 安装 Python...", percentage: 30 });
          }
          
          await runCommand("sudo", ["yum", "install", "-y", "python311", "python311-pip", "python311-devel"], { timeout: TIMEOUTS.INSTALL });
          
          if (progressCallback) {
            progressCallback({ stage: "Python 安装完成！", percentage: 100 });
          }
          
          return { success: true, method: "yum" };
          
        } catch (yumError) {
          try {
            // 尝试 pacman (Arch Linux)
            await runCommand("pacman", ["--version"], { timeout: TIMEOUTS.QUICK_CHECK });
            
            if (progressCallback) {
              progressCallback({ stage: "通过 pacman 安装 Python...", percentage: 30 });
            }
            
            await runCommand("sudo", ["pacman", "-S", "--noconfirm", "python", "python-pip"], { timeout: TIMEOUTS.INSTALL });
            
            if (progressCallback) {
              progressCallback({ stage: "Python 安装完成！", percentage: 100 });
            }
            
            return { success: true, method: "pacman" };
            
          } catch (pacmanError) {
            throw new Error("未找到支持的包管理器 (apt, yum, 或 pacman)");
          }
        }
      }
      
    } catch (error) {
      throw error;
    }
  }

  async installPython(progressCallback = null) {
    const platform = process.platform;
    
    try {
      if (progressCallback) {
        progressCallback({ stage: "开始 Python 安装...", percentage: 5 });
      }
      
      switch (platform) {
        case 'darwin':
          return await this.installPythonMacOS(progressCallback);
        case 'win32':
          return await this.installPythonWindows(progressCallback);
        case 'linux':
          return await this.installPythonLinux(progressCallback);
        default:
          throw new Error(`不支持的平台: ${platform}`);
      }
      
    } catch (error) {
      throw error;
    }
  }

  async isPythonInstalled() {
    const possibleCommands = ['python3.11', 'python3', 'python'];
    
    // 在 macOS 上，还要检查常见的 Python 安装路径
    const additionalPaths = process.platform === 'darwin' ? [
      '/usr/local/bin/python3',
      '/usr/local/bin/python3.11',
      '/opt/homebrew/bin/python3',
      '/opt/homebrew/bin/python3.11',
      '/usr/bin/python3',
      '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3',
      '/Library/Frameworks/Python.framework/Versions/3.10/bin/python3',
      '/Library/Frameworks/Python.framework/Versions/3.9/bin/python3',
    ] : [];
    
    // 首先检查 PATH 中的命令
    for (const cmd of possibleCommands) {
      try {
        const result = await runCommand(cmd, ['--version'], { timeout: TIMEOUTS.QUICK_CHECK });
        const versionMatch = result.output.match(/Python (\d+\.\d+)/);
        if (versionMatch) {
          const version = parseFloat(versionMatch[1]);
          // 接受任何 Python 3.x 版本
          if (version >= 3.0) {
            return { installed: true, command: cmd, version: version };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    // 然后检查 macOS 上的绝对路径
    for (const fullPath of additionalPaths) {
      try {
        if (fs.existsSync(fullPath)) {
          const result = await runCommand(fullPath, ['--version'], { timeout: TIMEOUTS.QUICK_CHECK });
          const versionMatch = result.output.match(/Python (\d+\.\d+)/);
          if (versionMatch) {
            const version = parseFloat(versionMatch[1]);
            if (version >= 3.0) {
              return { installed: true, command: fullPath, version: version };
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return { installed: false };
  }
}

module.exports = PythonInstaller;