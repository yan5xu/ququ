const fs = require('fs');
const path = require('path');

console.log('蛐蛐项目初始化设置...');

// 检查并创建必要的目录
const requiredDirs = [
  'assets',
  'src/dist',
  'models',
  'cache'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 创建目录: ${dir}`);
  } else {
    console.log(`📁 目录已存在: ${dir}`);
  }
});

// 检查环境变量文件
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ 创建 .env 文件');
} else if (fs.existsSync(envPath)) {
  console.log('📄 .env 文件已存在');
}

// 检查 assets 目录中的图标文件
const assetsPath = path.join(__dirname, 'assets');
if (fs.existsSync(assetsPath)) {
  const iconFiles = ['icon.icns', 'icon.ico', 'icon.png'];
  iconFiles.forEach(iconFile => {
    const iconPath = path.join(assetsPath, iconFile);
    if (!fs.existsSync(iconPath)) {
      console.log(`⚠️  缺少图标文件: ${iconFile}`);
    }
  });
}

// 检查 Python 环境
console.log('🐍 检查 Python 环境...');
const { spawn } = require('child_process');

const checkPython = () => {
  return new Promise((resolve) => {
    const python = spawn('python3', ['--version']);
    python.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Python3 已安装');
        resolve(true);
      } else {
        console.log('❌ Python3 未找到');
        resolve(false);
      }
    });
    python.on('error', () => {
      console.log('❌ Python3 未找到');
      resolve(false);
    });
  });
};

const checkFunASR = () => {
  return new Promise((resolve) => {
    const pip = spawn('pip3', ['show', 'funasr']);
    pip.on('close', (code) => {
      if (code === 0) {
        console.log('✅ FunASR 已安装');
        resolve(true);
      } else {
        console.log('⚠️  FunASR 未安装，请运行: pip3 install funasr');
        resolve(false);
      }
    });
    pip.on('error', () => {
      console.log('⚠️  无法检查 FunASR 安装状态');
      resolve(false);
    });
  });
};

// 异步检查
(async () => {
  const pythonInstalled = await checkPython();
  if (pythonInstalled) {
    await checkFunASR();
  }
  
  console.log('\n🎉 项目设置完成！');
  console.log('📝 下一步：');
  console.log('   1. 编辑 .env 文件，添加你的 AI API 密钥');
  console.log('   2. 如果需要本地语音识别，请安装 FunASR: pip3 install funasr');
  console.log('   3. 运行 pnpm run dev 启动开发服务器');
})();