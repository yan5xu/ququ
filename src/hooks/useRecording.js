import { useState, useRef, useCallback, useEffect } from 'react';
import { useModelStatus } from './useModelStatus';

/**
 * 录音功能Hook
 * 提供录音、停止录音、音频处理等功能
 */
export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState(null);
  const [audioData, setAudioData] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  
  // 添加防重复处理机制
  const processingRef = useRef({ isProcessingAudio: false, lastProcessTime: 0 });

  // 使用模型状态Hook
  const modelStatus = useModelStatus();

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // 检查FunASR是否就绪
      if (!modelStatus.isReady) {
        if (modelStatus.isLoading) {
          throw new Error('FunASR服务器正在启动中，请稍候...');
        } else if (modelStatus.error) {
          throw new Error('FunASR服务器未就绪，请检查配置');
        } else {
          throw new Error('正在准备FunASR服务器，请稍候...');
        }
      }

      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持录音功能');
      }

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // 创建MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      // 设置事件处理器
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        try {
          // 创建音频Blob
          const audioBlob = new Blob(audioChunksRef.current, {
            type: 'audio/webm;codecs=opus'
          });

          setAudioData(audioBlob);

          // 处理音频
          await processAudio(audioBlob);
        } catch (err) {
          setError(`音频处理失败: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.onerror = (event) => {
        setError(`录音错误: ${event.error?.message || '未知错误'}`);
        setIsRecording(false);
        setIsProcessing(false);
      };

      // 开始录音
      mediaRecorder.start(1000); // 每秒收集一次数据
      setIsRecording(true);

    } catch (err) {
      setError(`无法开始录音: ${err.message}`);
      setIsRecording(false);
    }
  }, [modelStatus.isReady, modelStatus.isLoading, modelStatus.error]);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();

      // 停止所有音频轨道
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  // 处理音频
  const processAudio = useCallback(async (audioBlob) => {
    processingRef.current.isProcessingAudio = true;
    
    try {
      const wavBlob = await convertToWav(audioBlob);

      if (window.electronAPI) {
        const arrayBuffer = await wavBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const transcriptionResult = await window.electronAPI.transcribeAudio(uint8Array);

        if (transcriptionResult.success) {
          const raw_text = transcriptionResult.text;
          
          // 准备转录数据
          const transcriptionData = {
            raw_text: raw_text,
            text: raw_text, // 初始文本设为原始文本
            confidence: transcriptionResult.confidence || 0,
            language: transcriptionResult.language || 'zh-CN',
            duration: transcriptionResult.duration || 0,
            file_size: uint8Array.length,
          };

          // 立即显示初步结果
          if (window.onTranscriptionComplete) {
            window.onTranscriptionComplete({ ...transcriptionResult, enhanced_by_ai: false });
          }

          // 异步处理AI优化和保存（只保存一次）
          setIsOptimizing(true);
          setTimeout(async () => {
            try {
              // 从设置中读取是否启用AI优化
              const useAI = await window.electronAPI.getSetting('enable_ai_optimization', true);

              let finalData = { ...transcriptionData };

              if (useAI) {
                try {
                  if (window.electronAPI && window.electronAPI.log) {
                    window.electronAPI.log('info', '开始AI文本优化:', raw_text.substring(0, 50) + '...');
                  }
                  
                  const result = await window.electronAPI.processText(raw_text, 'optimize');

                  if (result && result.success) {
                    const processed_text = result.text;
                    finalData.processed_text = processed_text;
                    // 如果AI优化后的文本与原始文本不同，则将优化后的文本作为主文本
                    if (processed_text && processed_text.trim() !== raw_text.trim()) {
                      finalData.text = processed_text;
                    }
                    if (window.electronAPI && window.electronAPI.log) {
                      window.electronAPI.log('info', 'AI文本优化成功', processed_text.substring(0, 50) + '...');
                    }
                  } else {
                    if (window.electronAPI && window.electronAPI.log) {
                      window.electronAPI.log('error', 'AI文本优化失败:', result);
                    }
                  }
                } catch (err) {
                  if (window.electronAPI && window.electronAPI.log) {
                    window.electronAPI.log('error', 'AI文本优化捕获到错误:', err);
                  }
                }
              }

              // 保存转录数据（只保存一次）
              if (window.electronAPI) {
                if (window.electronAPI && window.electronAPI.log) {
                  window.electronAPI.log('info', '准备保存转录数据:', finalData);
                }
                const savedResult = await window.electronAPI.saveTranscription(finalData);
                if (window.electronAPI && window.electronAPI.log) {
                  window.electronAPI.log('info', '转录数据保存成功:', savedResult);
                }

                // 通知UI更新并触发复制操作
                if (useAI && finalData.processed_text && finalData.processed_text !== raw_text) {
                  // 有AI优化结果时
                  const enhancedResult = {
                    ...transcriptionResult,
                    text: finalData.processed_text,
                    processed_text: finalData.processed_text,
                    enhanced_by_ai: true,
                  };
                  if (window.onAIOptimizationComplete) {
                    window.onAIOptimizationComplete(enhancedResult);
                  }
                } else {
                  // 没有AI优化或AI优化失败时，使用原始文本
                  const finalResult = {
                    ...transcriptionResult,
                    text: raw_text,
                    enhanced_by_ai: false,
                  };
                  if (window.onAIOptimizationComplete) {
                    window.onAIOptimizationComplete(finalResult);
                  }
                }
              }
            } catch (err) {
              if (window.electronAPI && window.electronAPI.log) {
                window.electronAPI.log('error', '处理和保存转录时出错:', err);
              }
            } finally {
              setIsOptimizing(false);
            }
          }, 100);

          return { ...transcriptionResult, enhanced_by_ai: false };
        } else {
          throw new Error(transcriptionResult.error || '语音识别失败');
        }
      } else {
        // Web环境模拟
        const mockResult = { success: true, text: '模拟识别结果。', confidence: 0.95, duration: 3.5 };
        if (window.onTranscriptionComplete) window.onTranscriptionComplete(mockResult);
        return mockResult;
      }
    } catch (err) {
      throw new Error(`音频处理失败: ${err.message}`);
    } finally {
      processingRef.current.isProcessingAudio = false;
    }
  }, []);

  // 转换音频格式为WAV
  const convertToWav = useCallback(async (audioBlob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result;

          // 创建AudioContext
          const audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
          });

          // 解码音频数据
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // 转换为WAV格式
          const wavBuffer = audioBufferToWav(audioBuffer);
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

          // 关闭AudioContext释放资源
          audioContext.close();

          resolve(wavBlob);
        } catch (err) {
          reject(new Error(`音频格式转换失败: ${err.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('读取音频文件失败'));
      };

      reader.readAsArrayBuffer(audioBlob);
    });
  }, []);

  // AudioBuffer转WAV格式
  const audioBufferToWav = (audioBuffer) => {
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // WAV文件头
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // 音频数据
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return buffer;
  };

  // 取消录音
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(false);
    setError(null);
    audioChunksRef.current = [];
  }, []);

  // 获取录音权限状态
  const checkPermissions = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state; // 'granted', 'denied', 'prompt'
    } catch (err) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('warn', '无法检查麦克风权限:', err);
      }
      return 'unknown';
    }
  }, []);


  return {
    isRecording,
    isProcessing,
    isOptimizing,
    error,
    audioData,
    startRecording,
    stopRecording,
    cancelRecording,
    checkPermissions
  };
};