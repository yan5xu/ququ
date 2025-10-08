import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

const HotkeySettings = ({ onSave, initialHotkey = 'CommandOrControl+Shift+Space' }) => {
  const [hotkey, setHotkey] = useState(initialHotkey);
  const [isRecording, setIsRecording] = useState(false);

  // 键名映射
  const keyMap = {
    'Control': 'Ctrl',
    ' ': '空格',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Escape': 'Esc',
    'Enter': '回车',
    'Backspace': '退格',
    'Delete': 'Delete',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
    'Tab': 'Tab',
    'CapsLock': '大写锁定',
    'Shift': 'Shift',
    'Alt': 'Alt',
    'Meta': 'Cmd',
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 忽略某些按键
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    // 获取修饰键
    const modifiers = [];
    if (e.ctrlKey && e.key !== 'Control') modifiers.push('Ctrl');
    if (e.shiftKey && e.key !== 'Shift') modifiers.push('Shift');
    if (e.altKey && e.key !== 'Alt') modifiers.push('Alt');
    if (e.metaKey && e.key !== 'Meta') modifiers.push('Cmd');

    // 获取主要按键
    let key = e.key;
    if (key.length === 1) { // 字母或数字
      key = key.toUpperCase();
    } else if (keyMap[key]) {
      key = keyMap[key];
    }

    // 组合热键字符串
    const keys = [...modifiers, key];
    const hotkeyString = keys.join('+');
    
    setHotkey(hotkeyString);
    setIsRecording(false);
    
    // 保存热键
    onSave(hotkeyString);
  };

  // 开始录制热键
  const startRecording = () => {
    setIsRecording(true);
  };

  // 重置为默认热键
  const resetToDefault = () => {
    const defaultHotkey = 'CommandOrControl+Shift+Space';
    setHotkey(defaultHotkey);
    onSave(defaultHotkey);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div 
          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
            isRecording 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' 
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
          }`}
          onClick={startRecording}
          onKeyDown={isRecording ? handleKeyDown : undefined}
          tabIndex={0}
          style={{ outline: 'none' }}
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">热键设置</div>
          <div className="flex items-center justify-between">
            <div className="font-mono text-lg text-gray-900 dark:text-gray-100">
              {isRecording ? (
                <span className="text-blue-600 dark:text-blue-400">按组合键...</span>
              ) : (
                hotkey
              )}
            </div>
            <div className="text-gray-400 dark:text-gray-500 text-sm">
              {isRecording ? '录制中' : '点击修改'}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={resetToDefault}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            重置
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotkeySettings;