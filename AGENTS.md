# AGENTS.md

此文件为在此代码库中工作的AI助手提供指导。

## 非标准构建命令

- `pnpm run dev` - 同时运行渲染进程(Vite)和主进程(Electron)
- `pnpm run dev:renderer` - Vite开发服务器必须从`src/`目录运行(不是根目录)
- `pnpm run build:renderer` - 任何Electron构建命令之前都必须先执行此命令
- `pnpm run setup` - Python/FunASR环境的自定义初始化脚本

## 关键架构模式

### FunASR服务器通信
- Python服务器(`funasr_server.py`)通过stdin/stdout进行JSON消息通信
- 音频转录前必须启动服务器(由`funasrManager.js`处理)
- 音频文件在系统临时目录创建，不在项目目录
- FunASR模型下载到用户数据目录，不是项目目录

### IPC架构(非标准)
- 所有Electron IPC处理器集中在`src/helpers/ipcHandlers.js`
- F2热键使用自定义双击检测，带发送者跟踪以防止内存泄漏
- 录音状态通过`hotkeyManager.js`在主进程和渲染进程间同步

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
- Python脚本(`funasr_server.py`)在项目根目录，不在src/

### 环境变量
- `ELECTRON_USER_DATA`由主进程设置，供Python脚本日志使用
- AI API配置使用`AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`格式
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

## 关键注意事项

### 路径解析
- Vite配置使用`src/`作为基础目录，影响所有相对导入
- 生产构建引用`app.asar.unpacked`中的Python脚本
- 资源路径从src目录使用`../assets`

### Python集成
- Python路径发现在macOS上包括Homebrew和Framework路径
- FunASR安装需要特定模型版本(v2.0.4)
- Python进程生成使用`windowsHide: true`选项

### 状态管理
- 无外部状态库 - 使用React hooks配合Electron IPC
- 录音状态必须在进程间手动同步
- 窗口可见性状态影响热键注册

### 开发vs生产环境
- 开发模式有2秒延迟等待Vite启动
- 生产模式需要为Python发现设置PATH环境
- 日志文件位置在开发和生产构建中不同