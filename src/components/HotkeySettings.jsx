import React, { useState, useEffect } from 'react';
import { Settings, RotateCcw } from 'lucide-react';

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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="mb-4">
        <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 chinese-title">
          热键设置
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          设置用于语音转文字的全局快捷键
        </p>
      </div>

      <div className="space-y-3">
        {/* 热键录入 */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24">
            热键:
          </label>
          <div 
            className={`flex-1 px-3 py-2 text-sm rounded-lg border focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${
              isRecording 
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' 
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
            }`}
            onClick={startRecording}
            onKeyDown={isRecording ? handleKeyDown : undefined}
            tabIndex={0}
            style={{ outline: 'none' }}
          >
            <div className="font-mono">
              {isRecording ? '按组合键...' : hotkey}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-3 pt-2">
          <div className="flex space-x-2">
            <button
              onClick={startRecording}
              className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{isRecording ? '正在录制...' : '修改'}</span>
            </button>
            
            <button
              onClick={resetToDefault}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>默认</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotkeySettings;