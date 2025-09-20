import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 热键管理Hook
 * 处理全局快捷键功能，包括F2双击功能
 */
export const useHotkey = () => {
  const [hotkey, setHotkey] = useState('CommandOrControl+Shift+Space');
  const [isRegistered, setIsRegistered] = useState(false);
  const registeredHotkeyRef = useRef(null); // 跟踪已注册的热键

  // 获取当前热键
  useEffect(() => {
    const getCurrentHotkey = async () => {
      try {
        if (window.electronAPI) {
          const currentHotkey = await window.electronAPI.getCurrentHotkey();
          if (currentHotkey) {
            setHotkey(currentHotkey);
          }
        }
      } catch (error) {
        if (window.electronAPI && window.electronAPI.log) {
          window.electronAPI.log('warn', '获取当前热键失败:', error);
        }
      }
    };

    getCurrentHotkey();
  }, []);

  // 移除F2双击相关的复杂逻辑，专注于传统热键

  // 注册传统热键 - 添加防重复注册机制
  const registerHotkey = async (newHotkey) => {
    try {
      // 防重复注册：如果已经注册了相同的热键，直接返回成功
      if (registeredHotkeyRef.current === newHotkey && isRegistered) {
        console.log(`热键 ${newHotkey} 已注册，跳过重复注册`);
        return true;
      }

      if (window.electronAPI) {
        const result = await window.electronAPI.registerHotkey(newHotkey);
        if (result.success) {
          registeredHotkeyRef.current = newHotkey;
          setHotkey(newHotkey);
          setIsRegistered(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '注册热键失败:', error);
      }
      return false;
    }
  };

  // 注销传统热键
  const unregisterHotkey = async (hotkeyToUnregister) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.unregisterHotkey(hotkeyToUnregister || hotkey);
        if (result.success) {
          setIsRegistered(false);
        }
      }
    } catch (error) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '注销热键失败:', error);
      }
    }
  };

  // 同步录音状态到主进程
  const syncRecordingState = useCallback(async (isRecording) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.setRecordingState(isRecording);
      }
    } catch (error) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '同步录音状态失败:', error);
      }
    }
  }, []);

  // 格式化热键显示
  const formatHotkey = (hotkeyString) => {
    return hotkeyString
      .replace('CommandOrControl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
      .replace('Shift', '⇧')
      .replace('Alt', '⌥')
      .replace('Space', '空格')
      .replace('F2', 'F2')
      .replace('+', ' + ');
  };

  return {
    hotkey: formatHotkey(hotkey),
    rawHotkey: hotkey,
    isRegistered,
    registerHotkey,
    unregisterHotkey,
    syncRecordingState
  };
};