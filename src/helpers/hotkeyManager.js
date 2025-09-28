const { globalShortcut } = require('electron');

class HotkeyManager {
  constructor(logger = null) {
    this.registeredHotkeys = new Map();
    this.isRecording = false;
    this.logger = logger;
    
    // 简化的热键防抖机制
    this.lastHotkeyTrigger = new Map();
    this.hotkeyDebounceTime = 200; // 200ms防抖时间，防止意外双击
  }

  

  /**
   * 注册传统热键（如Cmd+Shift+Space）
   * @param {string} hotkey - 热键组合
   * @param {Function} callback - 回调函数
   */
  registerHotkey(hotkey, callback) {
    // 检查是否已经注册了相同的热键
    if (this.registeredHotkeys.has(hotkey)) {
      if (this.logger && this.logger.info) {
        this.logger.info(`热键 ${hotkey} 已注册，跳过重复注册`);
      }
      return true; // 返回成功，因为热键已经注册
    }

    // 创建带简单防抖的回调函数
    const debouncedCallback = () => {
      const now = Date.now();
      const lastTrigger = this.lastHotkeyTrigger.get(hotkey) || 0;
      
      // 简单防抖：防止意外的快速重复触发
      if (now - lastTrigger < this.hotkeyDebounceTime) {
        return;
      }
      
      this.lastHotkeyTrigger.set(hotkey, now);
      callback();
    };

    const success = globalShortcut.register(hotkey, debouncedCallback);
    
    if (success) {
      if (this.logger && this.logger.info) {
        this.logger.info(`热键 ${hotkey} 注册成功`);
      }
      this.registeredHotkeys.set(hotkey, debouncedCallback);
      return true;
    } else {
      if (this.logger && this.logger.error) {
        this.logger.error(`热键 ${hotkey} 注册失败`);
      }
      return false;
    }
  }

  /**
   * 注销热键
   * @param {string} hotkey - 热键组合
   */
  unregisterHotkey(hotkey) {
    if (this.registeredHotkeys.has(hotkey)) {
      globalShortcut.unregister(hotkey);
      this.registeredHotkeys.delete(hotkey);
      if (this.logger && this.logger.info) {
        this.logger.info(`热键 ${hotkey} 已注销`);
      }
      return true;
    }
    return false;
  }

  /** 
   * 注销所有热键
   */
  unregisterAllHotkeys() {
    globalShortcut.unregisterAll();
    this.registeredHotkeys.clear();
    if (this.logger && this.logger.info) {
      this.logger.info('所有热键已注销');
    }
  }

  /**
   * 获取已注册的热键列表
   */
  getRegisteredHotkeys() {
    return Array.from(this.registeredHotkeys.keys());
  }

  /**
   * 检查热键是否已注册
   * @param {string} hotkey - 热键组合
   */
  isHotkeyRegistered(hotkey) {
    return this.registeredHotkeys.has(hotkey);
  }

  /**
   * 设置录音状态（用于外部同步状态）
   * @param {boolean} isRecording - 录音状态
   */
  setRecordingState(isRecording) {
    this.isRecording = isRecording;
  }

  /**
   * 获取当前录音状态
   */
  getRecordingState() {
    return this.isRecording;
  }
}

module.exports = HotkeyManager;