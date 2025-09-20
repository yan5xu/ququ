import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 热键管理Hook
 * 处理全局快捷键功能，包括F2双击功能
 */
export const useHotkey = (onF2DoubleClick) => {
  const [hotkey, setHotkey] = useState('CommandOrControl+Shift+Space');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isF2Registered, setIsF2Registered] = useState(false);
  
  // 使用ref来避免重复注册
  const f2CallbackRef = useRef(onF2DoubleClick);
  const f2RegisteredRef = useRef(false);
  const f2ListenerRef = useRef(null);

  // 更新回调函数引用
  useEffect(() => {
    f2CallbackRef.current = onF2DoubleClick;
  }, [onF2DoubleClick]);

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

  // 注册F2双击监听 - 只注册一次，且只在主窗口注册
  useEffect(() => {
    // 防止重复注册的多重检查
    if (!window.electronAPI || !onF2DoubleClick || f2RegisteredRef.current) {
      return;
    }

    // 检查是否为主窗口（通过URL参数判断）
    const urlParams = new URLSearchParams(window.location.search);
    const isControlPanel = urlParams.get('panel') === 'control';
    
    // 只有主窗口才注册F2热键
    if (isControlPanel) {
      console.log('控制面板窗口，跳过F2热键注册');
      return;
    }

    console.log('主窗口首次注册F2双击监听器');
    
    let isComponentMounted = true; // 用于检查组件是否仍然挂载
    
    // 注册F2热键
    const registerF2 = async () => {
      try {
        const result = await window.electronAPI.registerF2Hotkey();
        if (result.success && isComponentMounted) {
          f2RegisteredRef.current = true;
          setIsF2Registered(true);
          console.log('F2热键注册成功');
        } else if (isComponentMounted) {
          console.error('F2热键注册失败:', result.error);
        }
      } catch (error) {
        if (isComponentMounted) {
          console.error('F2热键注册异常:', error);
        }
      }
    };

    // 监听F2双击事件
    const removeF2Listener = window.electronAPI.onF2DoubleClick((event, data) => {
      console.log('收到F2双击事件:', data);
      if (f2CallbackRef.current && isComponentMounted) {
        f2CallbackRef.current(data);
      }
    });

    f2ListenerRef.current = removeF2Listener;
    registerF2();

    // 组件卸载时清理
    return () => {
      isComponentMounted = false;
      
      if (f2RegisteredRef.current && f2ListenerRef.current) {
        console.log('组件卸载，清理F2双击监听器');
        f2ListenerRef.current();
        if (window.electronAPI.unregisterF2Hotkey) {
          window.electronAPI.unregisterF2Hotkey().catch(console.error);
        }
        f2RegisteredRef.current = false;
        setIsF2Registered(false);
      }
    };
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 注册传统热键
  const registerHotkey = async (newHotkey) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.registerHotkey(newHotkey);
        if (result.success) {
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
      console.error('注销热键失败:', error);
    }
  };

  // 同步录音状态到主进程
  const syncRecordingState = useCallback(async (isRecording) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.setRecordingState(isRecording);
      }
    } catch (error) {
      console.error('同步录音状态失败:', error);
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
    isF2Registered,
    registerHotkey,
    unregisterHotkey,
    syncRecordingState
  };
};