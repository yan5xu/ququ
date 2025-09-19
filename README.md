# 蛐蛐 (QuQu)

基于FunASR和可配置AI模型的中文优化语音转文字桌面应用

## 📖 项目简介

蛐蛐是一个专门针对中文语音识别优化的桌面应用，结合了阿里巴巴的FunASR语音识别技术和可配置的AI大语言模型，为用户提供高精度的中文语音转文字服务和智能文本处理功能。

### ✨ 核心特性

- 🎤 **高精度中文语音识别** - 基于阿里FunASR的Paraformer-large模型
- 🤖 **智能文本处理** - 支持多种AI模型进行文本优化、纠错和格式化
- 🎯 **实时语音处理** - 支持实时录音和语音端点检测(VAD)
- 🖥️ **现代化界面** - 基于React 19和Tailwind CSS的中文优化UI
- ⚡ **快速响应** - 优化的音频处理和文本转换流程
- 🔒 **隐私保护** - 支持本地语音处理，保护用户隐私
- 📱 **跨平台支持** - 基于Electron，支持macOS、Windows和Linux

## 🛠️ 技术栈

### 前端技术
- **React 19** - 现代化的用户界面框架
- **TypeScript** - 类型安全的JavaScript
- **Tailwind CSS** - 实用优先的CSS框架
- **shadcn/ui** - 高质量的React组件库
- **Vite** - 快速的前端构建工具

### 桌面应用
- **Electron 36** - 跨平台桌面应用框架
- **better-sqlite3** - 本地数据存储

### AI和语音技术
- **FunASR** - 阿里巴巴开源的语音识别工具包
  - Paraformer-large模型 (中文语音识别)
  - FSMN-VAD模型 (语音端点检测)
  - CT-Transformer模型 (标点恢复)
- **可配置AI模型** - 支持OpenAI、Anthropic、阿里云通义千问等多种AI服务商 (负责内容优化和表达提升)
- **Python 3.8+** - FunASR运行环境

### 开发工具
- **pnpm** - 高效的包管理器
- **ESLint** - 代码质量检查
- **Concurrently** - 并行运行开发服务

## 🚀 快速开始

### 环境要求

- **Node.js 18+** 和 pnpm
- **Python 3.8+** (用于FunASR)
- **macOS 10.15+**, **Windows 10+**, 或 **Linux**

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd chinese-whispr
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，添加你的AI API密钥和配置
   ```

4. **安装FunASR环境** (可选，用于本地语音识别)
   ```bash
   # 安装Python依赖
   pip install funasr
   pip install librosa
   ```

5. **启动开发服务器**
   ```bash
   # 启动前端开发服务器
   pnpm run dev:renderer
   
   # 或启动完整应用 (需要Electron环境)
   pnpm run dev
   ```

### 配置AI模型API

在 `.env` 文件中添加你的API配置：

```env
# AI模型API配置
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.example.com/v1
AI_MODEL=your-model-name

# 示例配置：
# 阿里云通义千问（推荐）: AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1, AI_MODEL=qwen3-30b-a3b-instruct-2507
# OpenAI: AI_BASE_URL=https://api.openai.com/v1, AI_MODEL=gpt-4
# Anthropic: AI_BASE_URL=https://api.anthropic.com, AI_MODEL=claude-3-sonnet-20240229
```

## 📁 项目结构

```
chinese-whispr/
├── package.json              # 项目配置和依赖
├── main.js                   # Electron主进程
├── preload.js                # 安全的API桥接
├── funasr_server.py          # FunASR Python服务器脚本
├── tailwind.config.js        # Tailwind CSS配置
├── jsconfig.json             # JavaScript配置
├── components.json           # shadcn/ui配置
├── .env.example              # 环境变量模板
├── src/
│   ├── App.jsx               # 主应用组件
│   ├── main.jsx              # React入口点
│   ├── index.css             # 全局样式和主题
│   ├── vite.config.js        # Vite配置
│   ├── lib/
│   │   └── utils.ts          # 工具函数
│   ├── hooks/                # React Hooks
│   │   ├── useRecording.js   # 录音功能Hook
│   │   ├── useTextProcessing.js # AI文本处理Hook
│   │   ├── useHotkey.js      # 热键管理Hook
│   │   └── useWindowDrag.js  # 窗口拖拽Hook
│   └── components/
│       └── ui/               # shadcn/ui组件
│           ├── button.jsx
│           ├── sonner.jsx    # Toast通知组件
│           ├── card.jsx
│           ├── input.jsx
│           ├── label.jsx
│           └── loading-dots.jsx
└── assets/                   # 应用资源文件
```

## 🎯 功能特性

### 语音识别功能
- **实时录音** - 支持一键开始/停止录音
- **语音端点检测** - 自动检测语音开始和结束
- **高精度识别** - 基于Paraformer-large模型的中文语音识别
- **智能标点恢复** - 使用FunASR自带的CT-Transformer模型自动添加标点符号
- **音频格式支持** - 支持多种音频格式输入

### AI文本处理
- **内容优化** - 使用AI模型提升文本的流畅性和可读性，保留用户原始表达风格
- **语音识别优化** - 纠正ASR可能出现的错误和错别字
- **文本格式化** - 自动整理文本格式和段落结构
- **语法纠错** - 修正语音识别中的语法错误
- **表达提升** - 优化用词和表达方式，使语言更加准确流畅
- **多种处理模式** - 支持格式化、纠错、优化、总结等不同模式

### 用户界面
- **中文优化设计** - 专门针对中文用户的界面设计
- **拖拽式交互** - 可拖拽的录音控制按钮
- **实时状态反馈** - 录音和处理状态的可视化显示
- **响应式布局** - 适配不同屏幕尺寸
- **深色模式支持** - 跟随系统主题

## 🔧 开发脚本

```bash
# 开发相关
pnpm run dev              # 启动完整开发环境
pnpm run dev:renderer     # 仅启动前端开发服务器
pnpm run dev:main         # 仅启动Electron主进程

# 构建相关
pnpm run build:renderer   # 构建前端代码
pnpm run build           # 构建完整应用
pnpm run pack            # 打包应用 (无签名)
pnpm run dist            # 打包并分发

# 工具相关
pnpm run lint            # 代码质量检查
pnpm run setup           # 初始化环境配置
```

## 🌟 使用方法

### 基础语音转文字
1. 启动应用后，点击中央的麦克风按钮
2. 开始说话，应用会实时显示录音状态
3. 再次点击按钮停止录音
4. 等待FunASR语音识别和标点恢复完成
5. AI模型自动优化识别结果（纠错、优化表达、提升内容质量，保留原始语言风格）
6. 查看FunASR处理后的文本和AI优化后的文本

### 快捷键操作
- **全局热键** - `Cmd/Ctrl + Shift + Space` (可自定义)
- **ESC键** - 关闭应用窗口

### 文本操作
- **复制文本** - 点击文本区域的复制按钮
- **导出文本** - 点击导出按钮保存为文件
- **查看历史** - 通过历史记录按钮查看过往转录

## 🔧 配置选项

### 环境变量配置

```env
# AI模型API配置
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.example.com/v1
AI_MODEL=your-model-name

# 音频处理设置
AUDIO_SAMPLE_RATE=16000
AUDIO_CHANNELS=1
AUDIO_FORMAT=wav

# FunASR模型配置（用于语音识别和标点恢复）
FUNASR_MODEL_DIR=./models
FUNASR_CACHE_DIR=./cache

# 应用设置
DEBUG=false
LOG_LEVEL=info
LANGUAGE=zh-CN
```

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 开发规范
- 运行 `pnpm run lint` 检查代码质量
- 遵循现有的代码风格
- 为新功能添加适当的文档
- 在目标平台上测试更改

## 📄 许可证

本项目采用 Apache License 2.0 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [FunASR](https://github.com/modelscope/FunASR) - 阿里巴巴开源的语音识别工具包
- [阿里云通义千问](https://help.aliyun.com/zh/dashscope/) - 阿里云的大语言模型服务（推荐）
- [OpenAI](https://openai.com/) - OpenAI的GPT系列模型
- [Anthropic](https://www.anthropic.com/) - Anthropic的Claude系列模型
- [OpenWhispr](https://github.com/HeroTools/open-whispr) - 项目架构参考
- [shadcn/ui](https://ui.shadcn.com/) - 优秀的React组件库

## 📞 支持与反馈

如果您遇到问题或有建议，请：

1. 查看 [Issues](../../issues) 页面
2. 创建新的 Issue 描述问题
3. 参与社区讨论

---

**蛐蛐 - 让中文语音转文字更简单、更智能**