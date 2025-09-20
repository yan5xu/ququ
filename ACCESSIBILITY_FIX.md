# 蛐蛐文本插入功能修复说明

## 问题描述

之前蛐蛐无法在浏览器环境下的文本输入框插入文本，这是因为 Electron 应用需要特殊的 accessibility 配置才能与其他应用程序进行交互。

## 解决方案

基于提供的文章资料，我们实施了以下修复：

### 1. 启用 Electron Accessibility 支持

在 `main.js` 中添加了：
```javascript
// 启用 accessibility 支持
app.setAccessibilitySupportEnabled(true);
```

### 2. 添加 macOS 原生 API 调用支持

- 安装了 `osascript` npm 包
- 在 `ClipboardManager` 中集成了 osascript 功能
- 实现了 `AXManualAccessibility` 属性设置

### 3. 增强的文本插入方法

新增了 `insertTextDirectly()` 方法，支持：
- 直接通过 macOS Accessibility API 插入文本
- 自动设置 `AXManualAccessibility` 属性
- 智能回退到传统粘贴方法

### 4. 新的 IPC 接口

添加了新的 IPC 处理器：
- `insert-text-directly`: 直接插入文本
- `enable-macos-accessibility`: 启用 macOS accessibility

## 使用方法

### 在渲染进程中使用新的文本插入功能

```javascript
// 方法1：直接插入文本（推荐）
const result = await window.electronAPI.invoke('insert-text-directly', '要插入的文本');

// 方法2：启用 accessibility 后使用传统方法
await window.electronAPI.invoke('enable-macos-accessibility');
const result = await window.electronAPI.invoke('paste-text', '要插入的文本');
```

### 权限要求

在 macOS 上，应用需要以下权限：

1. **辅助功能权限**
   - 系统设置 → 隐私与安全性 → 辅助功能
   - 添加蛐蛐应用并启用

2. **自动设置 AXManualAccessibility**
   - 新的代码会自动尝试设置此属性
   - 如果失败，会回退到传统方法

## 测试

运行测试脚本来验证功能：

```bash
node test_text_insertion.js
```

测试脚本会检查：
- osascript 可用性
- Accessibility 权限状态
- AXManualAccessibility 设置
- 实际文本插入功能

## 技术细节

### AXManualAccessibility 设置

使用 JavaScript for Automation (JXA) 设置：

```javascript
ObjC.import("Cocoa");
let app = $.NSRunningApplication.currentApplication;
let pid = app.processIdentifier;
let axApp = $.AXUIElementCreateApplication(pid);
let result = $.AXUIElementSetAttributeValue(axApp, "AXManualAccessibility", true);
```

### 直接文本插入

通过 Accessibility API 直接插入文本：

```javascript
// 获取焦点元素
let focusedElement = {};
let result = $.AXUIElementCopyAttributeValue(axApp, "AXFocusedUIElement", focusedElement);

// 插入文本
let cfString = $.CFStringCreateWithCString($.kCFAllocatorDefault, textToInsert, $.kCFStringEncodingUTF8);
let insertResult = $.AXUIElementSetAttributeValue(focusedElement.value, "AXSelectedText", cfString);
```

## 兼容性

### 支持的平台
- ✅ macOS (完整支持，包括直接插入)
- ✅ Windows (通过 PowerShell SendKeys)
- ✅ Linux (通过 xdotool)

### 支持的应用类型
- ✅ 原生应用 (TextEdit, Pages, Word 等)
- ✅ Electron 应用 (VS Code, Slack 等)
- ✅ 浏览器应用 (Chrome, Safari, Firefox)
- ✅ 终端应用 (Terminal, iTerm2)

## 故障排除

### 常见问题

1. **权限被拒绝**
   ```
   解决方案：手动在系统设置中授予辅助功能权限
   ```

2. **osascript 不可用**
   ```
   解决方案：确保在 macOS 上运行，或安装 Xcode Command Line Tools
   ```

3. **文本插入失败**
   ```
   解决方案：检查目标应用是否有活跃的文本输入框
   ```

### 调试信息

启用详细日志记录：
```javascript
// 在 ClipboardManager 中会自动记录详细的调试信息
this.safeLog("🎯 尝试直接插入文本到活跃应用");
```

## 性能优化

新的实现包含以下优化：

1. **智能回退机制**：如果直接插入失败，自动回退到粘贴方法
2. **权限缓存**：避免重复检查权限
3. **错误处理**：完善的错误处理和用户提示

## 安全考虑

- 只在用户明确操作时插入文本
- 不会读取其他应用的内容
- 遵循 macOS 安全模型和权限要求

## 更新说明

### v1.1.0 新增功能
- ✅ 直接文本插入支持
- ✅ 自动 AXManualAccessibility 设置
- ✅ 增强的错误处理
- ✅ 跨平台兼容性改进

---

**注意**：此修复主要针对 macOS 平台进行了优化，Windows 和 Linux 平台保持原有的粘贴机制。