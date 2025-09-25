# AGENTS.md

此文件为在此代码库中工作的AI助手提供指导。

## 项目管理

- **GitHub Project**: https://github.com/users/yan5xu/projects/2
- 所有任务、功能开发和Bug跟踪都在项目看板中管理
- 开发进度和里程碑规划可在项目看板中查看

## 非标准构建命令

- `pnpm run dev` - 同时运行渲染进程(Vite)和主进程(Electron)
- `pnpm run dev:renderer` - Vite开发服务器必须从`src/`目录运行(不是根目录)
- `pnpm run build:renderer` - 任何Electron构建命令之前都必须先执行此命令
- `pnpm run prepare:python` - 下载并准备嵌入式Python环境(包含所有依赖)
- `pnpm run prepare:python:info` - 查看嵌入式Python环境信息
- `pnpm run test:python` - 测试嵌入式Python环境是否正常工作
- `pnpm run test:python:info` - 显示Python环境测试详细信息
- `pnpm run clean` - 清理构建文件和Python环境
- 所有构建命令(`build:mac`, `build:win`, `build:linux`)现在自动执行`prepare:python`

## 关键架构模式

### FunASR服务器通信
- Python服务器(`funasr_server.py`)通过stdin/stdout进行JSON消息通信
- 音频转录前必须启动服务器(由`funasrManager.js`处理)
- 音频文件在系统临时目录创建，不在项目目录
- FunASR模型下载到用户数据目录，不是项目目录
- 支持模型自动下载和状态监控(`download_models.py`)
- 模型缺失时提供优雅的错误处理和下载提示
- 新增模型文件检查机制，避免未下载模型时的初始化错误

### IPC架构(非标准)
- 所有Electron IPC处理器集中在`src/helpers/ipcHandlers.js`
- F2热键使用自定义双击检测，带发送者跟踪以防止内存泄漏
- 录音状态通过`hotkeyManager.js`在主进程和渲染进程间同步
- 新增模型管理IPC接口：`check-model-files`, `download-models`, `get-download-progress`
- 模型下载进度通过`model-download-progress`事件实时推送

### 窗口管理
- 主窗口和控制面板是独立的BrowserWindow实例
- 历史窗口加载`src/history.html`(与主应用分离的入口点)
- 所有窗口使用`preload.js`进行安全API暴露

### 数据库架构
- 使用better-sqlite3，自定义架构在`src/helpers/database.js`
- 转录表同时存储raw_text(FunASR)和processed_text(AI优化)
- 设置在键值表中JSON序列化存储

## 项目特定约定

### 文件组织
- `src/helpers/`中的文件是管理器类(不是工具函数)
- `src/hooks/`中的钩子遵循Electron集成的自定义模式
- Python脚本(`funasr_server.py`, `download_models.py`)在项目根目录，不在src/
- `scripts/`目录包含构建时脚本：
  - `prepare-embedded-python.js` - 嵌入式Python环境准备
  - `test-embedded-python.js` - Python环境测试和验证
- `python/`目录包含嵌入式Python运行时(构建时生成，在.gitignore中)

### 环境变量
- `ELECTRON_USER_DATA`由主进程设置，供Python脚本日志使用
- AI API配置通过应用内设置面板进行配置
- 开发模式通过`NODE_ENV=development`检测

### CSS架构
- 使用Tailwind 4.x，带中文字体优化
- 自定义CSS类：`.chinese-content`、`.chinese-title`、`.status-text`
- 硬编码WCAG 2.1兼容的对比度比例在CSS变量中
- Electron特定类：`.draggable`、`.non-draggable`

### 音频处理
- 音频以WAV格式在临时文件中处理
- FunASR处理VAD(语音活动检测)和标点恢复
- AI文本处理在FunASR转录完成后进行

### 日志管理
- 必须使用`src/helpers/logManager.js`而非console.log
- 应用日志和FunASR日志分别存储在用户数据目录
- 提供`logFunASR()`方法专门记录FunASR相关日志
- 日志以JSON格式存储，支持结构化查询
- 嵌入式Python环境通过`ELECTRON_USER_DATA`环境变量获取日志路径

## 关键注意事项

### 路径解析
- Vite配置使用`src/`作为基础目录，影响所有相对导入
- 生产构建引用`app.asar.unpacked`中的Python脚本和嵌入式Python环境
- 资源路径从src目录使用`../assets`
- 嵌入式Python环境路径：
  - 开发模式：`项目根目录/python/bin/python3.11`
  - 生产模式：`process.resourcesPath/app.asar.unpacked/python/bin/python3.11`

### Python集成
- 使用完全隔离的嵌入式Python环境(Python 3.11.6)
- 嵌入式环境包含所有必需依赖：numpy<2, torch==2.0.1, torchaudio==2.0.2, librosa>=0.11.0, funasr>=1.2.7
- FunASR安装需要特定模型版本(v2.0.4)
- Python进程生成使用`windowsHide: true`选项
- 完全隔离的环境变量设置：PYTHONHOME, PYTHONPATH, PYTHONDONTWRITEBYTECODE
- 清除系统Python环境变量干扰：PYTHONUSERBASE, PYTHONSTARTUP, VIRTUAL_ENV
- macOS代码签名权限配置支持Python扩展和JIT编译(`entitlements.mac.plist`)

### 状态管理
- 无外部状态库 - 使用React hooks配合Electron IPC
- 录音状态必须在进程间手动同步
- 窗口可见性状态影响热键注册

### 开发vs生产环境
- 开发模式有2秒延迟等待Vite启动
- 生产模式使用嵌入式Python环境，无需系统Python依赖
- 日志文件位置在开发和生产构建中不同
- 构建流程自动准备嵌入式Python环境和模型文件
- 构建产物包含完整的Python运行时(约1GB+)

## 新增功能架构

### 嵌入式Python环境
- 基于python-build-standalone项目的独立Python运行时
- 支持macOS ARM64和x86_64架构自动检测
- 包含完整的科学计算栈：numpy, torch, librosa等
- 构建时自动下载、安装和验证所有依赖
- 生产环境完全独立，不依赖系统Python

### 模型管理系统
- 三个核心模型：ASR(语音识别)、VAD(语音活动检测)、PUNC(标点恢复)
- 模型文件检查机制，支持大小和完整性验证
- 并行下载所有模型，支持实时进度显示
- 模型缺失时的优雅降级和用户提示
- 模型状态指示器组件提供可视化反馈

### 构建系统增强
- macOS代码签名和公证支持
- 嵌入式Python环境自动打包
- 构建前自动准备Python环境和依赖验证
- 支持清理命令移除Python环境和构建缓存