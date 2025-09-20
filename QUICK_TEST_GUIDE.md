# 蛐蛐文本插入功能快速测试指南

## 安装依赖

首先安装新添加的 osascript 依赖：

```bash
npm install osascript
```

## 启动应用

```bash
npm run dev
```

## 测试步骤

### 1. 基础功能测试

1. **打开文本编辑器**
   - 打开 TextEdit、VS Code、或任何文本编辑器
   - 确保光标在文本输入框中

2. **启动蛐蛐并录音**
   - 点击麦克风按钮开始录音
   - 说一段中文（如："今天天气很好"）
   - 停止录音

3. **验证自动插入**
   - 语音识别完成后，文本应该自动出现在文本编辑器中
   - 检查是否正确插入了识别的文本

### 2. 权限测试（macOS）

如果是首次使用或权限有问题：

1. **检查权限提示**
   - 应用会提示需要辅助功能权限
   - 按照提示打开系统设置

2. **手动授予权限**
   - 系统设置 → 隐私与安全性 → 辅助功能
   - 添加蛐蛐应用并启用复选框
   - 重启蛐蛐

### 3. 高级功能测试

运行独立测试脚本：

```bash
node test_text_insertion.js
```

这个脚本会测试：
- osascript 可用性
- Accessibility 权限
- AXManualAccessibility 设置
- 实际文本插入功能

## 预期结果

### ✅ 成功标志
- 语音识别完成后文本自动出现在目标应用
- 没有权限错误提示
- 原剪贴板内容得到保护
- 测试脚本显示所有项目为 ✅

### ⚠️ 可能的问题

1. **权限未授予**
   ```
   现象：文本只复制到剪贴板，不会自动插入
   解决：手动在系统设置中授予辅助功能权限
   ```

2. **osascript 模块加载失败**
   ```
   现象：控制台显示 "osascript 模块加载失败"
   解决：运行 npm install osascript
   ```

3. **目标应用无焦点**
   ```
   现象：文本插入失败
   解决：确保目标应用的文本输入框处于活跃状态
   ```

## 支持的应用

经过测试，以下应用支持文本插入：

### ✅ 完全支持
- TextEdit
- VS Code
- Sublime Text
- Terminal/iTerm2
- Safari 地址栏和搜索框
- Chrome 地址栏和搜索框
- Slack
- Discord
- 微信

### ⚠️ 部分支持
- 某些网页表单（取决于实现）
- 某些 Electron 应用（取决于配置）

## 故障排除

### 检查日志
应用会在控制台输出详细的调试信息：
```
✅ osascript 模块加载成功
🔧 尝试启用 macOS AXManualAccessibility
🎯 尝试直接插入文本到活跃应用
✅ 文本直接插入成功
```

### 手动测试权限
```bash
osascript -e 'tell application "System Events" to get name of first process'
```

如果返回应用名称，说明权限正常。

### 重置权限（如果需要）
1. 在系统设置中移除蛐蛐的辅助功能权限
2. 重启蛐蛐
3. 重新授予权限

## 技术说明

### 新增功能
- ✅ 自动启用 `app.setAccessibilitySupportEnabled(true)`
- ✅ 自动设置 `AXManualAccessibility` 属性
- ✅ 直接通过 Accessibility API 插入文本
- ✅ 智能回退机制

### API 变更
新增 IPC 方法：
- `insert-text-directly`: 直接插入文本
- `enable-macos-accessibility`: 启用 macOS accessibility

---

**如果遇到问题，请检查控制台日志并参考 ACCESSIBILITY_FIX.md 获取详细技术信息。**