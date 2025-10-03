# 蛐蛐 (QuQu) 贡献指南

欢迎参与「蛐蛐」项目的开发！本文档将帮助你了解项目的技术架构、开发流程和贡献方式。

## 📋 目录

- [项目概览](#项目概览)
- [技术架构](#技术架构)
- [开发环境搭建](#开发环境搭建)
- [项目结构](#项目结构)
- [核心模块说明](#核心模块说明)
- [开发工作流](#开发工作流)
- [代码规范](#代码规范)
- [测试指南](#测试指南)
- [常见问题](#常见问题)
- [提交规范](#提交规范)

---

## 项目概览

**蛐蛐 (QuQu)** 是一个基于 Electron 的桌面端语音转文字应用，专为中文优化。项目使用阿里巴巴的 FunASR 引擎进行本地语音识别，并支持连接 AI 大模型进行文本优化处理。

### 核心特性
- 🎯 **本地语音识别**：使用 FunASR Paraformer 模型，完全本地处理，保护隐私
- 💡 **AI 智能优化**：两段式引擎（ASR + LLM），自动纠错、去除口头禅
- 🌐 **灵活 AI 集成**：支持任何兼容 OpenAI API 的服务（通义千问、Kimi 等）
- 🚀 **开发者友好**：识别编程术语（camelCase、snake_case 等）
- 🖥️ **跨平台支持**：macOS、Windows、Linux

### 技术指标
- **代码量**：约 9,333 行 JavaScript/JSX
- **前端框架**：React 19 + Vite
- **桌面框架**：Electron 36.5.0
- **后端处理**：Python 3.11 + FunASR
- **数据库**：better-sqlite3
- **UI 组件**：shadcn/ui + Tailwind CSS 4.x

---

## 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron 主进程                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Window       │  │ Hotkey       │  │ Tray         │      │
│  │ Manager      │  │ Manager      │  │ Manager      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ FunASR       │  │ Database     │  │ Clipboard    │      │
│  │ Manager      │  │ Manager      │  │ Manager      │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
│         │                                                     │
│         │ stdin/stdout (JSON)                                │
│         ↓                                                     │
│  ┌──────────────────────────────────┐                       │
│  │  Python 子进程 (FunASR Server)    │                       │
│  │  - Paraformer (ASR)              │                       │
│  │  - FSMN-VAD (语音活动检测)        │                       │
│  │  - CT-Transformer (标点恢复)      │                       │
│  └──────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                         ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                    Electron 渲染进程                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Main Window  │  │ Settings     │  │ History      │      │
│  │ (App.jsx)    │  │ Window       │  │ Window       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  React Hooks:                                                │
│  - useRecording    - useTextProcessing                       │
│  - useModelStatus  - usePermissions                          │
│  - useHotkey       - useWindowDrag                           │
└─────────────────────────────────────────────────────────────┘
                         ↓
                   ┌──────────────┐
                   │  AI 服务      │
                   │ (可选配置)     │
                   └──────────────┘
```

### 关键技术决策

#### 1. **双进程架构**
- **Electron 主进程**：负责系统级操作（窗口管理、全局快捷键、文件操作）
- **Python 子进程**：运行 FunASR 服务器，处理语音识别
- **通信方式**：通过 stdin/stdout 传递 JSON 消息

#### 2. **嵌入式 Python 环境**
- 使用 [python-build-standalone](https://github.com/indygreg/python-build-standalone) 提供完全隔离的 Python 运行时
- 生产环境无需用户安装 Python，完全自包含
- 包含所有必需的科学计算依赖（numpy、torch、librosa 等）

#### 3. **本地优先的隐私保护**
- FunASR 模型完全在本地运行
- AI 优化是可选功能，用户可选择不启用
- 所有数据存储在本地 SQLite 数据库

---

## 开发环境搭建

### 前置要求
- **Node.js**: 18.x 或更高版本
- **pnpm**: 推荐使用 pnpm 作为包管理器
- **Python**: 3.8+ （开发模式需要）
- **操作系统**: macOS 10.15+, Windows 10+, 或 Linux

### 快速开始

#### 方式一：使用 uv（推荐）

[uv](https://github.com/astral-sh/uv) 是现代化的 Python 包管理器，能自动管理 Python 版本。

```bash
# 1. 克隆项目
git clone https://github.com/yan5xu/ququ.git
cd ququ

# 2. 安装 Node.js 依赖
pnpm install

# 3. 安装 uv（如果还没安装）
# macOS/Linux:
curl -LsSf https://astral.sh/uv/install.sh | sh
# Windows (PowerShell):
# powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# 4. 初始化 Python 环境（自动下载 Python 3.11 和所有依赖）
uv sync

# 5. 下载 FunASR 模型
uv run python download_models.py

# 6. 启动开发服务器
pnpm run dev
```

#### 方式二：使用系统 Python

```bash
# 1-2. 同上

# 3. 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# 4. 安装 Python 依赖
pip install funasr modelscope torch torchaudio librosa numpy

# 5. 下载 FunASR 模型
python download_models.py

# 6. 启动开发服务器
pnpm run dev
```

### 开发模式说明

运行 `pnpm run dev` 会启动两个并发进程：
- **Vite 开发服务器** (端口 5173)：渲染进程的热重载开发环境
- **Electron 主进程**：带 `--dev` 参数，会等待 Vite 启动后再加载页面

---

## 项目结构

```
ququ/
├── assets/                    # 静态资源（图标、图片等）
│   ├── icon.icns             # macOS 应用图标
│   ├── icon.ico              # Windows 应用图标
│   └── wechat-community-qrcode.png
├── src/                       # 渲染进程源代码
│   ├── components/           # React 组件
│   │   ├── ui/              # UI 基础组件（shadcn/ui）
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── model-status-indicator.jsx
│   │   │   └── ...
│   │   └── SettingsPanel.jsx
│   ├── helpers/              # 主进程管理器类
│   │   ├── clipboard.js     # 剪贴板操作管理
│   │   ├── database.js      # SQLite 数据库管理
│   │   ├── environment.js   # 环境配置管理
│   │   ├── funasrManager.js # FunASR 服务管理（核心）
│   │   ├── hotkeyManager.js # 全局快捷键管理
│   │   ├── ipcHandlers.js   # IPC 通信处理器（核心）
│   │   ├── logManager.js    # 日志管理
│   │   ├── pythonInstaller.js # Python 安装器
│   │   ├── tray.js          # 系统托盘管理
│   │   └── windowManager.js # 窗口管理
│   ├── hooks/                # React Hooks
│   │   ├── useHotkey.js
│   │   ├── useRecording.js
│   │   ├── useTextProcessing.js
│   │   ├── useModelStatus.js
│   │   └── usePermissions.js
│   ├── utils/                # 工具函数
│   ├── App.jsx               # 主应用组件
│   ├── settings.jsx          # 设置页面
│   ├── history.jsx           # 历史记录页面
│   ├── index.css             # 全局样式
│   ├── vite.config.js        # Vite 配置
│   └── *.html                # HTML 入口文件
├── scripts/                   # 构建脚本
│   ├── prepare-embedded-python.js  # 准备嵌入式 Python
│   └── test-embedded-python.js     # 测试 Python 环境
├── main.js                    # Electron 主进程入口
├── preload.js                 # Preload 脚本（安全桥接）
├── funasr_server.py          # FunASR Python 服务器（核心）
├── download_models.py        # 模型下载脚本
├── package.json              # Node.js 依赖和脚本
├── pyproject.toml            # Python 依赖（uv 配置）
├── tailwind.config.js        # Tailwind CSS 配置
├── README.md                 # 项目说明
├── AGENTS.md                 # AI 助手指导文档
└── .gitignore
```

### 关键文件说明

#### 主进程（Electron）
- **[main.js](main.js:1)**：应用入口，初始化所有管理器，设置错误处理
- **[preload.js](preload.js:1)**：安全桥接层，暴露 IPC API 给渲染进程
- **[src/helpers/ipcHandlers.js](src/helpers/ipcHandlers.js:1)**：所有 IPC 通信的处理逻辑集中在这里
- **[src/helpers/funasrManager.js](src/helpers/funasrManager.js:1)**：管理 FunASR Python 服务器的生命周期

#### 渲染进程（React）
- **[src/App.jsx](src/App.jsx:1)**：主界面，包含录音按钮、状态显示等
- **[src/settings.jsx](src/settings.jsx:1)**：设置页面，配置 AI 服务
- **[src/history.jsx](src/history.jsx:1)**：历史记录查看页面

#### Python 后端
- **[funasr_server.py](funasr_server.py:1)**：启动 FunASR 模型，通过 stdin/stdout 与主进程通信
- **[download_models.py](download_models.py:1)**：从 ModelScope 下载三个 FunASR 模型

---

## 核心模块说明

### 1. FunASR 管理器 (`funasrManager.js`)

负责 FunASR Python 服务器的完整生命周期管理。

**核心职责**：
- 启动和停止 Python 子进程
- 检查模型文件完整性
- 管理模型下载进度
- 处理音频转录请求
- 错误处理和重启逻辑

**关键方法**：
```javascript
// 启动 FunASR 服务器
await funasrManager.ensureServerStarted()

// 转录音频文件
const result = await funasrManager.transcribeAudio('/path/to/audio.wav')

// 检查模型文件状态
const status = await funasrManager.checkModelFiles()

// 下载模型
await funasrManager.downloadModels((progress) => {
  console.log(progress) // { model: 'asr', progress: 50, status: 'downloading' }
})
```

**通信协议**（与 Python 的 JSON 消息）：
```json
// 请求
{
  "type": "transcribe",
  "data": {
    "audio_file": "/tmp/recording.wav"
  }
}

// 响应
{
  "status": "success",
  "text": "转录的文本内容"
}
```

### 2. IPC 处理器 (`ipcHandlers.js`)

集中管理所有主进程与渲染进程的通信。

**核心 IPC 通道**：

| 通道名称 | 类型 | 功能 | 返回值 |
|---------|------|------|--------|
| `check-funasr-status` | handle | 检查 FunASR 服务状态 | `{ installed, running, models_initialized }` |
| `check-model-files` | handle | 检查模型文件完整性 | `{ asr, vad, punc }` |
| `download-models` | handle | 下载缺失的模型 | `{ success, message }` |
| `process-text` | handle | 用 AI 处理文本 | `{ processedText }` |
| `save-transcription` | handle | 保存转录记录到数据库 | `{ success }` |
| `get-transcription-history` | handle | 获取历史记录 | `Array<Transcription>` |
| `model-download-progress` | send | 模型下载进度（推送） | `{ model, progress, status }` |

**使用示例**（渲染进程）：
```javascript
// 检查模型状态
const modelStatus = await window.electron.invoke('check-model-files')

// 下载模型并监听进度
window.electron.on('model-download-progress', (progress) => {
  console.log(`${progress.model}: ${progress.progress}%`)
})
await window.electron.invoke('download-models')
```

### 3. 数据库管理 (`database.js`)

使用 better-sqlite3 进行本地数据持久化。

**数据库架构**：

```sql
-- 转录记录表
CREATE TABLE IF NOT EXISTS transcriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_text TEXT NOT NULL,           -- FunASR 原始识别文本
  processed_text TEXT,               -- AI 优化后的文本
  audio_duration REAL,               -- 音频时长（秒）
  processing_mode TEXT,              -- 处理模式（optimize/command/raw）
  created_at INTEGER NOT NULL,       -- 创建时间戳
  ai_model TEXT,                     -- 使用的 AI 模型
  metadata TEXT                      -- JSON 格式的额外元数据
);

-- 设置表（键值对）
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**使用示例**：
```javascript
// 保存转录记录
databaseManager.saveTranscription({
  rawText: '原始文本',
  processedText: '优化后的文本',
  audioDuration: 5.2,
  processingMode: 'optimize',
  aiModel: 'qwen-turbo'
})

// 查询历史记录
const history = databaseManager.getTranscriptionHistory(20) // 最近 20 条
```

### 4. React Hooks

**useRecording**：管理录音状态和音频捕获
```javascript
const { isRecording, startRecording, stopRecording, audioLevel } = useRecording()
```

**useTextProcessing**：处理文本优化逻辑
```javascript
const { processText, isProcessing } = useTextProcessing()
const result = await processText(rawText, 'optimize')
```

**useModelStatus**：监控 FunASR 模型状态
```javascript
const { modelStatus, isDownloading, checkModels } = useModelStatus()
```

**usePermissions**：检查系统权限（麦克风、辅助功能）
```javascript
const { hasMicPermission, hasAccessibilityPermission, requestPermissions } = usePermissions()
```

---

## 开发工作流

### 添加新功能的流程

#### 示例：添加一个新的文本处理模式

1. **在渲染进程添加 UI**
   ```jsx
   // src/settings.jsx
   <select name="processingMode">
     <option value="optimize">优化</option>
     <option value="command">命令</option>
     <option value="summarize">总结</option> {/* 新增 */}
   </select>
   ```

2. **在主进程添加处理逻辑**
   ```javascript
   // src/helpers/ipcHandlers.js
   async processTextWithAI(text, mode) {
     const prompts = {
       optimize: '...',
       command: '...',
       summarize: '请总结以下文本的要点...' // 新增
     }
     // ...
   }
   ```

3. **更新数据库记录**
   ```javascript
   // src/helpers/database.js
   saveTranscription({
     processingMode: 'summarize', // 新模式
     // ...
   })
   ```

4. **测试新功能**
   ```bash
   pnpm run dev
   # 手动测试录音 -> 总结流程
   ```

### 调试技巧

#### 1. 查看日志

应用日志存储在用户数据目录：

```bash
# macOS
~/Library/Application Support/蛐蛐/logs/

# Windows
%APPDATA%\蛐蛐\logs\

# Linux
~/.config/蛐蛐/logs/
```

日志文件：
- `app.log`：主进程日志
- `funasr.log`：FunASR 服务器日志

**使用日志管理器**：
```javascript
// 在主进程
const logger = require('./src/helpers/logManager')
logger.info('用户点击了录音按钮', { userId: 123 })
logger.error('FunASR 启动失败', { error: err.message })
logger.logFunASR('模型加载完成', { model: 'paraformer' })
```

#### 2. Electron DevTools

开发模式下自动打开 DevTools：
- **主窗口 DevTools**：查看渲染进程的 React 组件、网络请求
- **主进程 DevTools**：使用 VSCode 的 Node.js 调试器附加到主进程

```javascript
// main.js 中已配置
if (process.env.NODE_ENV === 'development') {
  mainWindow.webContents.openDevTools()
}
```

#### 3. FunASR 调试

测试 FunASR 服务独立运行：

```bash
# 激活虚拟环境
source .venv/bin/activate

# 手动运行 FunASR 服务器
python funasr_server.py

# 在另一个终端发送测试消息
echo '{"type":"transcribe","data":{"audio_file":"/path/to/test.wav"}}' | python funasr_server.py
```

#### 4. Python 环境问题排查

```bash
# 查看嵌入式 Python 信息
pnpm run prepare:python:info

# 测试嵌入式 Python 环境
pnpm run test:python:info

# 手动测试 FunASR 导入
.venv/bin/python -c "import funasr; print(funasr.__version__)"
```

---

## 代码规范

### JavaScript/JSX

遵循项目的 ESLint 配置（基于 `@eslint/js` 和 `eslint-plugin-react`）。

**命名约定**：
- **组件**：PascalCase（`SettingsPanel.jsx`）
- **Hooks**：camelCase，以 `use` 开头（`useRecording.js`）
- **管理器类**：PascalCase（`FunASRManager`）
- **常量**：UPPER_SNAKE_CASE（`MAX_RECORDING_DURATION`）

**代码风格**：
```javascript
// ✅ 推荐
const handleClick = async () => {
  try {
    const result = await window.electron.invoke('process-text', text)
    console.log(result)
  } catch (error) {
    logger.error('处理失败', error)
  }
}

// ❌ 避免
const handleClick = async () => {
  window.electron.invoke('process-text', text).then(result => {
    console.log(result)
  }).catch(error => {
    console.error(error) // 应使用 logger
  })
}
```

**React 最佳实践**：
- 使用函数组件和 Hooks
- 使用 `useCallback` 缓存事件处理器
- 使用 `useMemo` 缓存复杂计算
- 避免在渲染函数中创建新对象/数组

### Python

遵循 PEP 8 规范。

**关键约定**：
- 使用 4 空格缩进
- 函数名使用 snake_case
- 类名使用 PascalCase
- 添加类型注解（Python 3.8+）

```python
# funasr_server.py 示例
def process_audio(audio_path: str) -> dict:
    """
    处理音频文件并返回识别结果

    Args:
        audio_path: 音频文件路径

    Returns:
        包含识别文本的字典
    """
    try:
        result = asr_pipeline(audio_path)
        return {"status": "success", "text": result["text"]}
    except Exception as e:
        return {"status": "error", "message": str(e)}
```

### CSS/Tailwind

**使用 Tailwind 优先**：
```jsx
// ✅ 推荐
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
  点击我
</button>

// ❌ 避免（除非必须使用自定义 CSS）
<button className="custom-button">点击我</button>
```

**自定义 CSS 类**（仅在必要时）：
```css
/* index.css */
.chinese-content {
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  letter-spacing: 0.02em;
}

.wave-bar {
  animation: wave 1.2s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}
```

---

## 测试指南

### 手动测试清单

在提交 PR 前，请确保以下功能正常：

- [ ] **录音功能**
  - [ ] 点击录音按钮开始录音
  - [ ] 再次点击停止录音
  - [ ] F2 快捷键录音（按下开始，松开停止）
- [ ] **文本处理**
  - [ ] FunASR 转录完成
  - [ ] AI 优化文本（如果配置）
  - [ ] 文本自动粘贴到光标位置
- [ ] **模型管理**
  - [ ] 首次启动检测到模型缺失
  - [ ] 模型下载进度正常显示
  - [ ] 下载完成后 FunASR 正常启动
- [ ] **设置页面**
  - [ ] AI 配置保存并生效
  - [ ] 快捷键自定义
  - [ ] 处理模式切换
- [ ] **历史记录**
  - [ ] 查看历史记录
  - [ ] 复制历史文本
  - [ ] 搜索历史记录
- [ ] **系统集成**
  - [ ] 系统托盘图标显示
  - [ ] 全局快捷键响应
  - [ ] 窗口拖拽（在 macOS 上）

### 自动化测试（待完善）

项目目前缺少系统的自动化测试，这是一个很好的贡献机会！

**可以添加的测试**：
- 单元测试（Jest + React Testing Library）
  - Hooks 测试
  - 工具函数测试
- 集成测试（Spectron/Playwright for Electron）
  - 端到端录音流程
  - 设置页面交互
- Python 测试（pytest）
  - FunASR 服务器消息处理
  - 模型加载逻辑

---

## 常见问题

### 1. FunASR 服务器启动失败

**症状**：应用显示 "FunASR 初始化中..." 但一直无法启动

**排查步骤**：
```bash
# 1. 检查 Python 环境
source .venv/bin/activate
python --version  # 应该是 3.8+

# 2. 检查 FunASR 是否安装
python -c "import funasr; print(funasr.__version__)"

# 3. 检查模型文件
ls -lh ~/.cache/modelscope/

# 4. 手动运行 FunASR 服务器查看错误
python funasr_server.py
```

**常见原因**：
- Python 依赖未安装：运行 `pip install -r requirements.txt`
- 模型文件损坏：删除 `~/.cache/modelscope/` 并重新下载
- macOS SSL 问题：`pip install "urllib3<2.0"`

### 2. 热键冲突

**症状**：F2 或其他快捷键无响应

**解决方案**：
1. 检查其他应用是否占用该快捷键
2. 在设置中更改快捷键
3. 重启应用

### 3. 文本无法自动粘贴

**症状**：转录完成但文本未插入到目标应用

**检查权限**：
- **macOS**：系统偏好设置 > 安全性与隐私 > 辅助功能 > 勾选「蛐蛐」
- **Windows**：应用应自动拥有权限
- **Linux**：确保安装了 `xdotool`

### 4. 构建失败

**症状**：`pnpm run build` 报错

**常见问题**：
```bash
# Vite 构建失败
cd src && pnpm run build  # 单独测试渲染进程构建

# Python 环境未准备
pnpm run prepare:python:embedded  # 重新准备嵌入式环境

# 清理缓存后重试
pnpm run clean
rm -rf node_modules dist
pnpm install
```

---

## 提交规范

### Commit Message 格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响逻辑）
- `refactor`: 重构（不改变功能）
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建系统或依赖变更
- `ci`: CI 配置变更
- `chore`: 其他杂项

**示例**：
```bash
git commit -m "feat(recording): 支持自定义音频采样率"
git commit -m "fix(funasr): 修复模型初始化时的内存泄漏"
git commit -m "docs: 更新贡献指南中的测试章节"
git commit -m "refactor(ipc): 简化 IPC 处理器的错误处理逻辑"
```

### Pull Request 流程

1. **Fork 项目并克隆**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ququ.git
   cd ququ
   git remote add upstream https://github.com/yan5xu/ququ.git
   ```

2. **创建特性分支**
   ```bash
   git checkout -b feature/my-awesome-feature
   ```

3. **开发并提交**
   ```bash
   git add .
   git commit -m "feat: 添加新的文本处理模式"
   ```

4. **保持分支最新**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

5. **推送到你的 Fork**
   ```bash
   git push origin feature/my-awesome-feature
   ```

6. **创建 Pull Request**
   - 访问 GitHub 上你的 Fork
   - 点击 "New Pull Request"
   - 填写 PR 模板（描述变更、测试情况等）
   - 等待代码审查

### PR 检查清单

- [ ] 代码符合项目的编码规范
- [ ] 通过所有现有测试（如果有）
- [ ] 添加了必要的测试（对于新功能）
- [ ] 更新了相关文档（README、AGENTS.md 等）
- [ ] Commit message 符合规范
- [ ] 已手动测试所有变更
- [ ] 没有引入新的依赖（如有必要需说明理由）
- [ ] 考虑了跨平台兼容性（macOS/Windows/Linux）

---

## 📚 学习资源

### Electron
- [Electron 官方文档](https://www.electronjs.org/docs/latest/)
- [Electron IPC 通信指南](https://www.electronjs.org/docs/latest/tutorial/ipc)

### FunASR
- [FunASR GitHub](https://github.com/modelscope/FunASR)
- [ModelScope](https://modelscope.cn/)

### React & Vite
- [React 官方文档](https://react.dev/)
- [Vite 官方文档](https://vitejs.dev/)

### Tailwind CSS
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 组件库](https://ui.shadcn.com/)

---

## 🤝 社区与支持

- **GitHub Issues**: [https://github.com/yan5xu/ququ/issues](https://github.com/yan5xu/ququ/issues)
- **项目看板**: [https://github.com/users/yan5xu/projects/2](https://github.com/users/yan5xu/projects/2)
- **微信交流群**: 见 [README.md](README.md#交流与社区)

---

## 🎉 贡献者指南

感谢你考虑为「蛐蛐」做出贡献！每一行代码、每一个建议、每一次测试反馈都对项目至关重要。

如果你是第一次贡献开源项目，建议从以下任务开始：
- 📖 改进文档（修正错别字、补充说明）
- 🐛 修复简单的 Bug（查看 [Issues](https://github.com/yan5xu/ququ/issues) 中标记为 `good first issue` 的任务）
- 🧪 编写测试用例
- 🌐 翻译文档到其他语言

期待在 GitHub 上看到你的 Pull Request！🚀
