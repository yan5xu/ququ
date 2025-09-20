import { useState, useEffect, useCallback } from 'react';

/**
 * 模型状态监控Hook
 * 监控FunASR模型的加载状态
 */
export const useModelStatus = () => {
  const [modelStatus, setModelStatus] = useState({
    isLoading: true,
    isReady: false,
    error: null,
    progress: 0
  });

  // 检查模型状态
  const checkModelStatus = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const status = await window.electronAPI.checkFunASRStatus();
        
        if (status.success) {
          setModelStatus({
            isLoading: false,
            isReady: status.models_initialized || false,
            error: null,
            progress: status.models_initialized ? 100 : 0
          });
        } else {
          setModelStatus({
            isLoading: false,
            isReady: false,
            error: status.error || '模型状态检查失败',
            progress: 0
          });
        }
      }
    } catch (error) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '检查模型状态失败:', error);
      }
      setModelStatus({
        isLoading: false,
        isReady: false,
        error: error.message || '模型状态检查失败',
        progress: 0
      });
    }
  }, []);

  // 初始化时检查状态
  useEffect(() => {
    checkModelStatus();
    
    // 设置定期检查（仅在模型未就绪时）
    const interval = setInterval(() => {
      if (!modelStatus.isReady) {
        checkModelStatus();
      }
    }, 3000); // 每3秒检查一次

    return () => clearInterval(interval);
  }, [checkModelStatus, modelStatus.isReady]);

  // 监听模型初始化事件
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onProcessingUpdate) {
      const unsubscribe = window.electronAPI.onProcessingUpdate((event, data) => {
        if (data.type === 'model_initialization') {
          setModelStatus(prev => ({
            ...prev,
            isLoading: data.isLoading,
            isReady: data.isReady,
            progress: data.progress || prev.progress
          }));
        }
      });

      return unsubscribe;
    }
  }, []);

  return {
    ...modelStatus,
    checkModelStatus
  };
};