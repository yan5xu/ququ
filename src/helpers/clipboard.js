const { clipboard } = require("electron");

class ClipboardManager {
  constructor() {
    this.history = [];
    this.maxHistory = 10;
  }

  copyText(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    try {
      clipboard.writeText(text);
      this.addToHistory(text);
      return true;
    } catch (error) {
      console.error("复制到剪贴板失败:", error);
      return false;
    }
  }

  pasteText() {
    try {
      return clipboard.readText();
    } catch (error) {
      console.error("从剪贴板读取失败:", error);
      return "";
    }
  }

  addToHistory(text) {
    // 避免重复
    const existingIndex = this.history.indexOf(text);
    if (existingIndex !== -1) {
      this.history.splice(existingIndex, 1);
    }

    // 添加到历史记录开头
    this.history.unshift(text);

    // 限制历史记录长度
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
  }

  hasText() {
    return clipboard.hasText();
  }

  clear() {
    try {
      clipboard.clear();
      return true;
    } catch (error) {
      console.error("清空剪贴板失败:", error);
      return false;
    }
  }
}

module.exports = ClipboardManager;