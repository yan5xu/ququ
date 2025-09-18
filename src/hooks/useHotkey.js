import { useState, useEffect } from 'react';

/**
 * 热键管理Hook
 * 处理全局快捷键功能
 */
export const useHotkey = () => {
  const [hotkey, setHotkey] = useState('CommandOrControl+Shift+Space');
  const [isRegistered, setIsRegistered] = useState(false);

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
        console.warn('获取当前热键失败:', error);
      }
    };

    getCurrentHotkey();
  }, []);

  // 注册热键
  const registerHotkey = async (newHotkey) => {
    try {
      if (window.electronAPI) {
        const success = await window.electronAPI.registerHotkey(newHotkey);
        if (success) {
          setHotkey(newHotkey);
          setIsRegistered(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('注册热键失败:', error);
      return false;
    }
  };

  // 注销热键
  const unregisterHotkey = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.unregisterHotkey();
        setIsRegistered(false);
      }
    } catch (error) {
      console.error('注销热键失败:', error);
    }
  };

  // 格式化热键显示
  const formatHotkey = (hotkeyString) => {
    return hotkeyString
      .replace('CommandOrControl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
      .replace('Shift', '⇧')
      .replace('Alt', '⌥')
      .replace('Space', '空格')
      .replace('+', ' + ');
  };

  return {
    hotkey: formatHotkey(hotkey),
    rawHotkey: hotkey,
    isRegistered,
    registerHotkey,
    unregisterHotkey
  };
};