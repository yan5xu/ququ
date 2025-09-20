import { useState, useRef, useCallback, useEffect } from 'react';
import { useTextProcessing } from './useTextProcessing';
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

  // 使用文本处理Hook和模型状态Hook
  const { processText } = useTextProcessing();
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
    try {
      // 转换音频格式为WAV（FunASR需要）
      const wavBlob = await convertToWav(audioBlob);

      // 调用Electron API进行语音识别
      if (window.electronAPI) {
        // 将Blob转换为ArrayBuffer
        const arrayBuffer = await wavBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // 调用FunASR进行转录
        const result = await window.electronAPI.transcribeAudio(uint8Array);

        if (result.success) {
          // 立即显示FunASR识别结果（已包含标点恢复）
          const initialResult = {
            ...result,
            original_text: result.raw_text || result.text, // 保存无标点的原始文本
            enhanced_by_ai: false
          };

          if (window.onTranscriptionComplete) {
            window.onTranscriptionComplete(initialResult);
          }

          // 异步进行AI内容优化，不阻塞界面显示
          setIsOptimizing(true);

          // 使用setTimeout确保界面先更新
          setTimeout(async () => {
            try {
              if (window.electronAPI && window.electronAPI.log) {
                window.electronAPI.log('info', '开始AI优化，原始文本:', result.text);
              }
              // 调用AI进行内容优化（不包括标点恢复）
              const enhanced = await processText(result.text, 'optimize');
              if (window.electronAPI && window.electronAPI.log) {
                window.electronAPI.log('info', 'AI优化结果:', enhanced);
              }

              if (enhanced) {
                // AI优化完成，更新界面（即使结果与原文相同也显示）
                const enhancedResult = {
                  ...result,
                  text: enhanced,
                  original_text: result.raw_text || result.text,
                  enhanced_by_ai: true
                };

                if (window.electronAPI && window.electronAPI.log) {
                  window.electronAPI.log('info', '准备触发AI优化完成事件:', enhancedResult);
                }

                // 保存转录结果（包含原始文本、FunASR标点恢复文本和AI优化后的文本）
                const transcriptionData = {
                  text: enhanced,
                  raw_text: result.raw_text || result.text,
                  funasr_text: result.text, // FunASR处理后的文本（含标点）
                  original_text: result.raw_text || result.text,
                  confidence: result.confidence || 0,
                  language: result.language || 'zh-CN',
                  duration: result.duration || 0,
                  file_size: uint8Array.length,
                  enhanced_by_ai: true
                };

                await window.electronAPI.saveTranscription(transcriptionData);

                // 触发AI优化完成事件
                if (window.onAIOptimizationComplete) {
                  if (window.electronAPI && window.electronAPI.log) {
                    window.electronAPI.log('info', '触发AI优化完成事件');
                  }
                  window.onAIOptimizationComplete(enhancedResult);
                } else {
                  if (window.electronAPI && window.electronAPI.log) {
                    window.electronAPI.log('error', 'window.onAIOptimizationComplete 回调函数不存在');
                  }
                }
              } else {
                if (window.electronAPI && window.electronAPI.log) {
                  window.electronAPI.log('info', 'AI优化结果为空，不更新界面');
                }
              }
            } catch (optimizeError) {
              if (window.electronAPI && window.electronAPI.log) {
                window.electronAPI.log('warn', 'AI内容优化失败，保持FunASR处理结果:', optimizeError);
              }

              // 保存FunASR处理结果
              const transcriptionData = {
                text: result.text,
                raw_text: result.raw_text || result.text,
                funasr_text: result.text,
                original_text: result.raw_text || result.text,
                confidence: result.confidence || 0,
                language: result.language || 'zh-CN',
                duration: result.duration || 0,
                file_size: uint8Array.length,
                enhanced_by_ai: false
              };

              await window.electronAPI.saveTranscription(transcriptionData);
            } finally {
              setIsOptimizing(false);
            }
          }, 100); // 100ms延迟确保界面先更新

          return initialResult;
        } else {
          throw new Error(result.error || '语音识别失败');
        }
      } else {
        // Web环境下的模拟处理
        if (window.electronAPI && window.electronAPI.log) {
          window.electronAPI.log('warn', 'Electron API不可用，使用模拟数据');
        }
        const mockResult = {
          success: true,
          text: '这是模拟的语音识别结果，用于测试界面功能。',
          confidence: 0.95,
          duration: 3.5
        };

        if (window.onTranscriptionComplete) {
          window.onTranscriptionComplete(mockResult);
        }

        return mockResult;
      }
    } catch (err) {
      throw new Error(`音频处理失败: ${err.message}`);
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