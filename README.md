<div align="center">

<!-- 在这里放置您的Logo图片 -->
<!-- 例如: <img src="assets/logo.png" width="150" /> -->
<br/>
<br/>

# 蛐蛐 (QuQu)

**开源免费的 Wispr Flow 替代方案 | 为中文而生的下一代智能语音工作流**

</div>

<div align="center">

<!-- 徽章 (Badges) - 您可以后续替换为动态徽章服务 (如 shields.io) -->
<img src="https://img.shields.io/badge/license-Apache_2.0-blue.svg" alt="License">
<img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey" alt="Platform">
<img src="https://img.shields.io/badge/release-v1.0.0-brightgreen" alt="Release">
<img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">

</div>

<br/>

> **厌倦了 Wispr Flow 的订阅费用？寻找开源免费的语音输入方案？来试试「蛐蛐」！**

**蛐蛐 (QuQu)** 是 **Wispr Flow 的开源免费替代方案**，专为中文用户打造的注重隐私的桌面端语音输入与文本处理工具。与 Wispr Flow 不同，蛐蛐完全开源免费，数据本地处理，专为中文优化，支持国产AI模型。

### 🆚 vs Wispr Flow：开源免费的替代方案

| 核心对比 | 🎯 蛐蛐 (QuQu) | 💰 Wispr Flow |
|---------|---------------|---------------|
| **价格** | ✅ **完全免费** | ❌ $12/月订阅 |
| **隐私** | ✅ **本地处理** | ❌ 云端处理 |
| **中文** | ✅ **专为中文优化** | ⚠️ 通用支持 |
| **AI模型** | ✅ **国产AI支持** | ❌ 仅国外模型 |

想象一下，你可以像和朋友聊天一样写作。说的内容被实时、精准地转换成文字，口误和"嗯、啊"等废话被自动修正，甚至能根据你的要求，自动整理成邮件格式或代码片段。**这就是「蛐蛐」为你带来的体验 —— 而且完全免费！**

---

## ✨ 核心优势

| 特性 | 蛐蛐 (QuQu) 的解决方案 |
| :--- | :--- |
| 🎯 **顶尖中文识别，隐私至上** | 内置阿里巴巴 **FunASR Paraformer** 模型，在您的电脑本地运行。这意味着它能听懂中文互联网的"梗"，也能保护您最私密的语音数据不被上传。 |
| 💡 **会思考的"两段式引擎"** | 独创 **"ASR精准识别 + LLM智能优化"** 工作流。它不仅能转录，更能"理解"和"重塑"您的语言。**自动过滤口头禅**、**修正错误表述**（例如将"周三开会，不对，是周四"直接输出为"周四开会"），这些都只是基础操作。 |
| 🌐 **为国内优化的开放AI生态** | 支持任何兼容OpenAI API的服务，并**优先适配国内顶尖模型** (如通义千问、Kimi等)。这意味着更快的响应速度、更低的费用和更好的合规性。 |
| 🚀 **开发者与效率专家挚爱** | 能准确识别并格式化 `camelCase` 和 `snake_case` 等编程术语。通过自定义AI指令，更能实现**上下文感知**，根据您当前的应用（写代码、回邮件）智能调整输出格式。 |


## 🎬 功能演示

<!-- 在这里放置您的GIF演示图 -->
<!-- 例如: <img src="assets/demo.gif" /> -->
<p align="center"><i>(这里是应用的GIF演示图)</i></p>

- **一键唤醒**: 全局快捷键 F2，随时随地开始记录。
- **实时识别**: 本地 FunASR 引擎提供高精度中文识别。
- **智能优化**: 连接您的AI模型，自动润色、纠错、总结。
- **无缝粘贴**: 转换完成的文本自动粘贴到您当前光标位置。

### 🚀 从 Wispr Flow 迁移？

如果你正在使用 Wispr Flow 但希望**节省订阅费用**、**保护隐私数据**、**更好的中文支持**，那么蛐蛐就是你的完美选择！

## 🚀 快速开始

### 1. 环境要求
- **Node.js 18+** 和 pnpm
- **Python 3.8+** (用于运行本地FunASR服务)
- **macOS 10.15+**, **Windows 10+**, 或 **Linux**

### 2. 项目初始化

#### 方案一：使用 uv (推荐) 🌟

[uv](https://github.com/astral-sh/uv) 是现代化的 Python 包管理器，能自动管理 Python 版本和依赖，避免环境冲突：

```bash
# 1. 克隆项目
git clone https://github.com/yan5xu/ququ.git
cd ququ

# 2. 安装 Node.js 依赖
pnpm install

# 3. 安装 uv (如果尚未安装)
# macOS/Linux:
curl -LsSf https://astral.sh/uv/install.sh | sh
# Windows:
# powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# 4. 初始化 Python 环境 (uv 会自动下载 Python 3.11 和所有依赖)
uv sync

# 5. 下载 FunASR 模型
uv run python download_models.py

# 6. 启动应用!
pnpm run dev
```

#### 方案二：使用系统 Python

如果您更喜欢使用系统 Python 环境：

```bash
# 1. 克隆项目
git clone https://github.com/yan5xu/ququ.git
cd ququ

# 2. 安装 Node.js 依赖
pnpm install

# 3. 创建虚拟环境 (推荐)
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# 4. 安装 Python 依赖
pip install funasr modelscope torch torchaudio librosa numpy

# 5. 下载 FunASR 模型
python download_models.py

# 6. 启动应用!
pnpm run dev
```

#### 方案三：使用嵌入式 Python 环境

项目还支持完全隔离的嵌入式 Python 环境（主要用于生产构建）：

```bash
# 1-2. 同上克隆项目和安装 Node.js 依赖

# 3. 准备嵌入式 Python 环境
pnpm run prepare:python

# 4. 测试环境是否正常
pnpm run test:python

# 5. 启动应用
pnpm run dev
```

### 3. 配置AI模型
启动应用后，在 **设置页面** 中填入您的AI服务商提供的 **API Key**、**Base URL** 和 **模型名称**。支持通义千问、Kimi、智谱AI等国产模型，配置将自动保存在本地。

### 4. 故障排除

#### 常见初始化问题

**问题**: `ModuleNotFoundError: No module named 'funasr'`
```bash
# 解决方案 1: 使用 uv (推荐)
uv sync
uv run python download_models.py

# 解决方案 2: 重新安装依赖
pip install funasr modelscope torch torchaudio librosa numpy

# 解决方案 3: 使用嵌入式环境
pnpm run prepare:python
```

**问题**: FunASR 模型下载失败或加载缓慢
```bash
# 检查网络连接，确保能访问 modelscope.cn
# 如果在 macOS 上遇到 SSL 警告：
pip install "urllib3<2.0"

# 手动下载模型：
python download_models.py
# 或使用 uv:
uv run python download_models.py
```

**问题**: Python 版本不兼容
```bash
# 使用 uv 自动管理 Python 版本 (推荐)
uv sync  # 会自动下载 Python 3.11

# 或手动安装 Python 3.8+
# 检查当前版本: python3 --version
```

#### 环境选择建议

| 使用场景 | 推荐方案 | 优点 |
|---------|---------|------|
| **新用户/快速体验** | uv | 自动管理，无环境冲突 |
| **开发者/自定义需求** | 系统 Python + 虚拟环境 | 灵活控制，便于调试 |
| **生产部署** | 嵌入式环境 | 完全隔离，无外部依赖 |

#### 其他常见问题

- **权限问题**: 在某些系统上可能需要使用 `--user` 参数安装Python包
- **网络问题**: 首次运行时需要下载FunASR模型，请确保网络连接正常
- **模型路径**: 模型默认下载到 `~/.cache/modelscope/` 目录

## 🛠️ 技术栈

- **前端**: React 19, TypeScript, Tailwind CSS, shadcn/ui, Vite
- **桌面端**: Electron
- **语音技术 (本地)**: FunASR (Paraformer-large, FSMN-VAD, CT-Transformer)
- **AI模型 (可配置)**: 兼容 OpenAI, Anthropic, 阿里云通义千问, Kimi 等
- **数据库**: better-sqlite3

## 🤝 参与贡献

我们是一个开放和友好的社区，欢迎任何形式的贡献！

### 📋 项目管理

我们使用 GitHub Projects 来管理项目的开发进度和任务规划：

- 📊 **项目看板**: [蛐蛐 开发看板](https://github.com/users/yan5xu/projects/2) - 查看当前开发状态、功能规划和进度跟踪
- 🎯 **任务管理**: 所有功能开发、Bug修复和改进建议都在项目看板中进行跟踪
- 🔄 **开发流程**: 从想法提出到功能发布的完整流程可视化

### 如何参与

- 🤔 **提建议**: 对产品有任何想法？欢迎到 [Issues](https://github.com/yan5xu/ququ/issues) 页面提出。
- 🐛 **报Bug**: 发现程序出错了？请毫不犹豫地告诉我们。
- 💻 **贡献代码**: 如果您想添加新功能或修复Bug，请参考以下步骤：
    1.  Fork 本项目
    2.  创建您的特性分支 (`git checkout -b feature/your-amazing-feature`)
    3.  提交您的更改 (`git commit -m 'feat: Add some amazing feature'`)
    4.  将您的分支推送到远程 (`git push origin feature/your-amazing-feature`)
    5.  创建一个 Pull Request

## 💬 交流与社区 (Communication & Community)

「蛐蛐」是一个由社区驱动的开源项目，我们相信开放的交流能激发最好的创意。你的每一个想法、每一次反馈都对项目至关重要。

我们诚挚地邀请你加入官方微信交流群，在这里你可以：

*   🚀 **获取一手资讯**：第一时间了解项目更新、新功能预告和开发路线图。
*   💬 **直接与开发者对话**：遇到安装难题？有绝妙的功能点子？在群里可以直接 @ 作者和核心贡献者。
*   💡 **分享与学习**：交流你的 AI 指令 (Prompt) 和自动化工作流，看看别人是怎么把「蛐蛐」玩出花的。
*   🤝 **参与项目共建**：从一个想法的提出，到一次代码的提交 (Pull Request)，社区是你最好的起点。

<div align="center">

| 微信扫码，加入官方交流群 |
| :----------------------------------------------------------: |
| <img src="assets/wechat-community-qrcode.png" width="200" alt="QuQu Official WeChat Group" /> <br> *QuQu Official WeChat Group* |
| <p style="font-size:12px; color: #888;">如果二维码过期或无法加入，请在 <a href="https://github.com/yan5xu/ququ/issues">Issues</a> 中提一个 Issue 提醒我们，谢谢！</p> |

</div>

## 🙏 致谢

本项目的诞生离不开以下优秀项目的启发和支持：

- [FunASR](https://github.com/modelscope/FunASR): 阿里巴巴开源的工业级语音识别工具包。
- [OpenWhispr](https://github.com/HeroTools/open-whispr): 为本项目提供了优秀的架构参考。
- [shadcn/ui](https://ui.shadcn.com/): 提供了高质量、可组合的React组件。

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证。