const fs = require('fs');
const path = require('path');
const os = require('os');

class LogManager {
  constructor() {
    this.logDir = this.getLogDirectory();
    this.logFile = path.join(this.logDir, 'app.log');
    this.funasrLogFile = path.join(this.logDir, 'funasr.log');
    this.ensureLogDirectory();
  }

  getLogDirectory() {
    // 在用户目录下创建日志文件夹
    const userDataPath = require('electron').app.getPath('userData');
    return path.join(userDataPath, 'logs');
  }

  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('创建日志目录失败:', error);
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      pid: process.pid
    };

    // 输出到控制台
    console[level](`[${timestamp}] ${message}`, data || '');

    // 写入日志文件
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  info(message, data) {
    this.log('info', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }

  // 记录FunASR相关日志
  logFunASR(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      source: 'FunASR'
    };

    console[level](`[FunASR] ${message}`, data || '');

    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.funasrLogFile, logLine);
    } catch (error) {
      console.error('写入FunASR日志文件失败:', error);
    }
  }

  // 获取最近的日志
  getRecentLogs(lines = 100) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.trim().split('\n').filter(line => line.trim());
      
      return logLines
        .slice(-lines)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line, timestamp: new Date().toISOString() };
          }
        });
    } catch (error) {
      console.error('读取日志文件失败:', error);
      return [];
    }
  }

  // 获取FunASR日志
  getFunASRLogs(lines = 100) {
    try {
      if (!fs.existsSync(this.funasrLogFile)) {
        return [];
      }

      const content = fs.readFileSync(this.funasrLogFile, 'utf8');
      const logLines = content.trim().split('\n').filter(line => line.trim());
      
      return logLines
        .slice(-lines)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line, timestamp: new Date().toISOString() };
          }
        });
    } catch (error) {
      console.error('读取FunASR日志文件失败:', error);
      return [];
    }
  }

  // 清理旧日志
  cleanOldLogs(daysToKeep = 7) {
    try {
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      
      [this.logFile, this.funasrLogFile].forEach(logFile => {
        if (fs.existsSync(logFile)) {
          const stats = fs.statSync(logFile);
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(logFile);
            this.info(`清理旧日志文件: ${logFile}`);
          }
        }
      });
    } catch (error) {
      console.error('清理旧日志失败:', error);
    }
  }

  // 获取日志文件路径
  getLogFilePath() {
    return this.logFile;
  }

  getFunASRLogFilePath() {
    return this.funasrLogFile;
  }

  // 获取系统信息用于调试
  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      appVersion: require('electron').app.getVersion(),
      userDataPath: require('electron').app.getPath('userData'),
      logDir: this.logDir,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PATH: process.env.PATH,
        PYTHON_PATH: process.env.PYTHON_PATH
      }
    };
  }
}

module.exports = LogManager;