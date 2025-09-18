const { spawn } = require("child_process");

// 超时配置
const TIMEOUTS = {
  QUICK_CHECK: 5000,      // 5秒 - 快速检查
  PIP_UPGRADE: 60000,     // 1分钟 - pip升级
  INSTALL: 300000,        // 5分钟 - 安装包
  DOWNLOAD: 600000,       // 10分钟 - 下载
};

/**
 * 运行命令并返回结果
 * @param {string} command - 要执行的命令
 * @param {string[]} args - 命令参数
 * @param {object} options - 选项
 * @returns {Promise<{output: string, code: number}>}
 */
function runCommand(command, args = [], options = {}) {
  const { timeout = TIMEOUTS.QUICK_CHECK, cwd, env } = options;
  
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd,
      env: env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';
    let isResolved = false;

    // 设置超时
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        process.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms: ${command} ${args.join(' ')}`));
      }
    }, timeout);

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);

      const output = stdout + stderr;
      
      if (code === 0) {
        resolve({ output, code });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });

    process.on('error', (error) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);
      reject(new Error(`Process error: ${error.message}`));
    });
  });
}

module.exports = {
  runCommand,
  TIMEOUTS
};