const { globalShortcut } = require('electron');

class HotkeyManager {
  constructor() {
    this.registeredHotkeys = new Map();
    this.f2ClickTimes = [];
    this.f2DoubleClickTimeout = 500; // 500ms内的两次点击算作双击
    this.onF2DoubleClick = null;
    this.isRecording = false;
  }

  /**
   * 注册F2双击热键
   * @param {Function} callback - 双击回调函数
   */
  registerF2DoubleClick(callback) {
    // 如果已经注册了F2，只更新回调函数，不重新注册
    if (this.registeredHotkeys.has('F2')) {
      console.log('F2热键已注册，更新回调函数');
      this.onF2DoubleClick = callback;
      return true;
    }
    
    this.onF2DoubleClick = callback;
    
    // 注册F2单击监听
    const success = globalShortcut.register('F2', () => {
      this.handleF2Click();
    });

    if (success) {
      console.log('F2热键首次注册成功');
      this.registeredHotkeys.set('F2', callback);
      return true;
    } else {
      console.error('F2热键注册失败');
      return false;
    }
  }

  /**
   * 处理F2按键点击
   */
  handleF2Click() {
    const now = Date.now();
    this.f2ClickTimes.push(now);

    // 清理超过双击时间窗口的点击记录
    this.f2ClickTimes = this.f2ClickTimes.filter(
      time => now - time <= this.f2DoubleClickTimeout
    );

    // 检查是否为双击
    if (this.f2ClickTimes.length >= 2) {
      console.log('检测到F2双击');
      this.handleF2DoubleClick();
      this.f2ClickTimes = []; // 清空点击记录
    }
  }

  /**
   * 处理F2双击事件
   */
  handleF2DoubleClick() {
    if (this.onF2DoubleClick) {
      // 根据当前状态决定动作
      const action = this.isRecording ? 'stop' : 'start';
      console.log(`F2双击 - ${action === 'start' ? '开始' : '停止'}录音，当前状态: ${this.isRecording}`);
      
      this.onF2DoubleClick({
        action: action,
        currentState: this.isRecording
      });
      
      // 不在这里更新状态，让渲染进程来更新
    }
  }

  /**
   * 注册传统热键（如Cmd+Shift+Space）
   * @param {string} hotkey - 热键组合
   * @param {Function} callback - 回调函数
   */
  registerHotkey(hotkey, callback) {
    // 先注销已存在的热键
    if (this.registeredHotkeys.has(hotkey)) {
      this.unregisterHotkey(hotkey);
    }

    const success = globalShortcut.register(hotkey, callback);
    
    if (success) {
      console.log(`热键 ${hotkey} 注册成功`);
      this.registeredHotkeys.set(hotkey, callback);
      return true;
    } else {
      console.error(`热键 ${hotkey} 注册失败`);
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
      console.log(`热键 ${hotkey} 已注销`);
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
    this.f2ClickTimes = [];
    console.log('所有热键已注销');
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