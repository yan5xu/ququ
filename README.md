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

### 2. 安装与配置

```bash
# 1. 克隆项目
git clone https://github.com/yan5xu/ququ.git
cd ququ

# 2. 安装依赖
pnpm install

# 3. 安装FunASR环境 (本地语音识别核心)
pip install funasr modelscope

# 4. 启动应用!
pnpm run dev
```

### 3. 配置AI模型
启动应用后，在 **设置页面** 中填入您的AI服务商提供的 **API Key**、**Base URL** 和 **模型名称**。支持通义千问、Kimi、智谱AI等国产模型，配置将自动保存在本地。

### 4. 故障排除

#### FunASR模型加载缓慢问题

如果您在macOS上遇到SSL兼容性警告导致模型加载变慢，可以通过以下命令修复：

```bash
# 修复urllib3兼容性问题，提升模型加载速度
python3 -m pip install "urllib3<2.0"
```

#### 其他常见问题

- **Python环境问题**: 确保使用Python 3.8+版本
- **权限问题**: 在某些系统上可能需要使用 `--user` 参数安装Python包
- **网络问题**: 首次运行时需要下载FunASR模型，请确保网络连接正常

## 🛠️ 技术栈

- **前端**: React 19, TypeScript, Tailwind CSS, shadcn/ui, Vite
- **桌面端**: Electron
- **语音技术 (本地)**: FunASR (Paraformer-large, FSMN-VAD, CT-Transformer)
- **AI模型 (可配置)**: 兼容 OpenAI, Anthropic, 阿里云通义千问, Kimi 等
- **数据库**: better-sqlite3

## 🤝 参与贡献

我们是一个开放和友好的社区，欢迎任何形式的贡献！

- 🤔 **提建议**: 对产品有任何想法？欢迎到 [Issues](https://github.com/yan5xu/ququ/issues) 页面提出。
- 🐛 **报Bug**: 发现程序出错了？请毫不犹豫地告诉我们。
- 💻 **贡献代码**: 如果您想添加新功能或修复Bug，请参考以下步骤：
    1.  Fork 本项目
    2.  创建您的特性分支 (`git checkout -b feature/your-amazing-feature`)
    3.  提交您的更改 (`git commit -m 'feat: Add some amazing feature'`)
    4.  将您的分支推送到远程 (`git push origin feature/your-amazing-feature`)
    5.  创建一个 Pull Request

## 🙏 致谢

本项目的诞生离不开以下优秀项目的启发和支持：

- [FunASR](https://github.com/modelscope/FunASR): 阿里巴巴开源的工业级语音识别工具包。
- [OpenWhispr](https://github.com/HeroTools/open-whispr): 为本项目提供了优秀的架构参考。
- [shadcn/ui](https://ui.shadcn.com/): 提供了高质量、可组合的React组件。

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证。