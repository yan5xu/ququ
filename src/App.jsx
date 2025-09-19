import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import { toast } from "sonner";
import { LoadingDots } from "./components/ui/loading-dots";
import { StatusLight } from "./components/ui/status-light";
import { useHotkey } from "./hooks/useHotkey";
import { useWindowDrag } from "./hooks/useWindowDrag";
import { useRecording } from "./hooks/useRecording";
import { useTextProcessing } from "./hooks/useTextProcessing";
import { useModelStatus } from "./hooks/useModelStatus";
import { Mic, MicOff, Settings, History, Copy, Download } from "lucide-react";

// 声波图标组件（空闲/悬停状态）
const SoundWaveIcon = ({ size = 16, isActive = false }) => {
  return (
    <div className="flex items-center justify-center gap-1">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`bg-slate-600 dark:bg-gray-300 rounded-full transition-all duration-150 shadow-sm ${
            isActive ? "wave-bar" : ""
          }`}
          style={{
            width: size * 0.15,
            height: isActive ? size * 0.8 : size * 0.4,
            animationDelay: isActive ? `${i * 0.1}s` : "0s",
          }}
        />
      ))}
    </div>
  );
};

// 语音波形指示器组件（处理状态）
const VoiceWaveIndicator = ({ isListening }) => {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`w-0.5 bg-white rounded-full transition-all duration-150 drop-shadow-sm ${
            isListening ? "animate-pulse h-5" : "h-2"
          }`}
          style={{
            animationDelay: isListening ? `${i * 0.1}s` : "0s",
            animationDuration: isListening ? `${0.6 + i * 0.1}s` : "0s",
          }}
        />
      ))}
    </div>
  );
};

// 增强的工具提示组件
const Tooltip = ({ children, content, emoji }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-white bg-gradient-to-r from-neutral-800 to-neutral-700 rounded-md whitespace-nowrap z-10 transition-opacity duration-150"
          style={{ fontSize: "10px" }}
        >
          {emoji && <span className="mr-1">{emoji}</span>}
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-neutral-800"></div>
        </div>
      )}
    </div>
  );
};

// 文本显示区域组件
const TextDisplay = ({ originalText, processedText, isProcessing, onCopy, onExport }) => {
  if (!originalText && !processedText) {
    return null; // 当没有文本时不显示任何内容，避免重复
  }

  return (
    <div className="space-y-4">
      {/* 原始识别文本 - 简化设计，单行显示 */}
      {originalText && (
        <div className="bg-slate-100/80 dark:bg-gray-800/80 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="chinese-content text-gray-800 dark:text-gray-200 flex-1 truncate pr-2">
              {originalText}
            </p>
            <button
              onClick={() => onCopy(originalText)}
              className="p-1.5 hover:bg-slate-200/70 dark:hover:bg-gray-700/70 rounded-md transition-colors flex-shrink-0"
              title="复制识别文本"
            >
              <Copy className="w-4 h-4 text-slate-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* AI处理后文本 */}
      {(processedText || isProcessing) && (
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-5 border-l-4 border-emerald-400 dark:border-emerald-500 shadow-lg border border-emerald-200/50 dark:border-emerald-700/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold chinese-title text-emerald-700 dark:text-emerald-400">🤖 AI优化后</h3>
            <div className="flex space-x-2">
              {processedText && (
                <>
                  <button
                    onClick={() => onCopy(processedText)}
                    className="p-2 hover:bg-emerald-200/70 dark:hover:bg-emerald-700/30 rounded-lg transition-colors shadow-sm"
                    title="复制优化文本"
                  >
                    <Copy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </button>
                  <button
                    onClick={() => onExport(processedText)}
                    className="p-2 hover:bg-emerald-200/70 dark:hover:bg-emerald-700/30 rounded-lg transition-colors shadow-sm"
                    title="导出文本"
                  >
                    <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </button>
                </>
              )}
            </div>
          </div>
          {isProcessing ? (
            <div className="flex items-center space-x-3 text-emerald-700 dark:text-emerald-400">
              <LoadingDots />
              <span className="status-text">AI正在优化文本...</span>
            </div>
          ) : (
            <p className="chinese-content leading-loose fade-in text-gray-800 dark:text-gray-200">
              {processedText}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [isHovered, setIsHovered] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [processedText, setProcessedText] = useState("");
  const [showTextArea, setShowTextArea] = useState(false);
  
  const { hotkey } = useHotkey();
  const { isDragging, handleMouseDown, handleMouseMove, handleMouseUp, handleClick } = useWindowDrag();
  const modelStatus = useModelStatus();
  
  const {
    isRecording,
    isProcessing: isRecordingProcessing,
    isOptimizing,
    startRecording,
    stopRecording,
    error: recordingError
  } = useRecording();
  
  const {
    processText,
    isProcessing: isTextProcessing,
    error: textProcessingError
  } = useTextProcessing();

  // 处理录音完成（FunASR识别完成）
  const handleRecordingComplete = useCallback(async (transcriptionResult) => {
    if (transcriptionResult.success && transcriptionResult.text) {
      // 立即显示FunASR识别的原始文本
      setOriginalText(transcriptionResult.text);
      setShowTextArea(true);
      
      // 清空之前的处理结果，等待AI优化
      setProcessedText("");

      toast.success("🎤 语音识别完成，AI正在优化文本...");
    }
  }, []);

  // 处理AI优化完成
  const handleAIOptimizationComplete = useCallback(async (optimizedResult) => {
    console.log('AI优化完成回调被触发:', optimizedResult);
    if (optimizedResult.success && optimizedResult.enhanced_by_ai && optimizedResult.text) {
      // 显示AI优化后的文本
      setProcessedText(optimizedResult.text);
      toast.success("🤖 AI文本优化完成！");
      console.log('AI优化文本已设置:', optimizedResult.text);
    } else {
      console.warn('AI优化结果无效:', optimizedResult);
    }
  }, []);

  // 设置转录完成回调
  useEffect(() => {
    console.log('设置回调函数');
    window.onTranscriptionComplete = handleRecordingComplete;
    window.onAIOptimizationComplete = handleAIOptimizationComplete;
    
    // 验证回调函数是否正确设置
    console.log('回调函数设置完成:', {
      onTranscriptionComplete: typeof window.onTranscriptionComplete,
      onAIOptimizationComplete: typeof window.onAIOptimizationComplete
    });
    
    return () => {
      console.log('清理回调函数');
      window.onTranscriptionComplete = null;
      window.onAIOptimizationComplete = null;
    };
  }, [handleRecordingComplete, handleAIOptimizationComplete]);

  // 处理复制文本
  const handleCopyText = async (text) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      toast.success("文本已复制到剪贴板");
    } catch (error) {
      toast.error("无法复制文本到剪贴板");
    }
  };

  // 处理导出文本
  const handleExportText = async (text) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.exportTranscriptions('txt');
        toast.success("文本已导出到文件");
      } else {
        // Web环境下载文件
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `蛐蛐转录_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error("无法导出文本文件");
    }
  };

  // 切换录音状态
  const toggleRecording = () => {
    if (!isRecording && !isRecordingProcessing) {
      startRecording();
    } else if (isRecording) {
      stopRecording();
    }
  };

  // 处理关闭窗口
  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.hideWindow();
    }
  };

  // 处理打开设置
  const handleOpenSettings = () => {
    if (window.electronAPI) {
      window.electronAPI.openControlPanel();
    }
  };

  // 处理打开历史记录
  const handleOpenHistory = () => {
    if (window.electronAPI) {
      window.electronAPI.openHistoryWindow();
    }
  };

  // 监听全局热键
  useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onToggleDictation(() => {
        toggleRecording();
      });
      return unsubscribe;
    }
  }, [isRecording, isRecordingProcessing]);

  // 监听键盘事件
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  // 错误处理
  useEffect(() => {
    if (recordingError) {
      toast.error(recordingError);
    }
  }, [recordingError]);

  useEffect(() => {
    if (textProcessingError) {
      toast.error(textProcessingError);
    }
  }, [textProcessingError]);

  // 确定当前麦克风状态
  const getMicState = () => {
    if (isRecording) return "recording";
    if (isRecordingProcessing) return "processing";
    if (isOptimizing) return "optimizing";
    if (isHovered && !isRecording && !isRecordingProcessing && !isOptimizing) return "hover";
    return "idle";
  };

  const micState = getMicState();
  const isListening = isRecording || isRecordingProcessing;

  // 获取麦克风按钮属性
  const getMicButtonProps = () => {
    const baseClasses =
      "rounded-full w-16 h-16 flex items-center justify-center relative overflow-hidden border-2 border-white/80 cursor-pointer transition-all duration-300 shadow-xl";

    switch (micState) {
      case "idle":
        return {
          className: `${baseClasses} bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-700 dark:to-gray-600 hover:from-slate-200 hover:to-slate-300 dark:hover:from-gray-600 dark:hover:to-gray-500 hover:shadow-2xl transform hover:scale-105`,
          tooltip: `按 [${hotkey}] 开始录音`,
        };
      case "hover":
        return {
          className: `${baseClasses} bg-gradient-to-br from-slate-200 to-slate-300 dark:from-gray-600 dark:to-gray-500 scale-110 shadow-2xl`,
          tooltip: `按 [${hotkey}] 开始录音`,
        };
      case "recording":
        return {
          className: `${baseClasses} bg-gradient-to-br from-red-400 to-red-500 recording-pulse shadow-2xl`,
          tooltip: "正在录音...",
        };
      case "processing":
        return {
          className: `${baseClasses} bg-gradient-to-br from-blue-400 to-blue-500 cursor-not-allowed shadow-2xl`,
          tooltip: "正在识别语音...",
        };
      case "optimizing":
        return {
          className: `${baseClasses} bg-gradient-to-br from-emerald-400 to-emerald-500 cursor-not-allowed shadow-2xl`,
          tooltip: "AI正在优化文本...",
        };
      default:
        return {
          className: `${baseClasses} bg-gradient-to-br from-slate-100 to-slate-200`,
          tooltip: "点击开始录音",
        };
    }
  };

  const micProps = getMicButtonProps();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 pb-4">
      {/* 主界面 */}
      <div className="max-w-2xl mx-auto min-h-screen flex flex-col">
        {/* 标题栏 */}
        <div
          className="flex items-center justify-between mb-8 draggable"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 chinese-title">
            蛐蛐
          </h1>
          <div className="flex items-center space-x-3 non-draggable">
            {/* 模型状态灯 */}
            <StatusLight
              modelStatus={modelStatus}
              size="w-4 h-4"
              showTooltip={true}
            />
            
            <Tooltip content="历史记录" emoji="📋">
              <button
                onClick={handleOpenHistory}
                className="p-3 hover:bg-white/70 dark:hover:bg-gray-700/70 rounded-xl transition-colors shadow-sm"
              >
                <History className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
            </Tooltip>
            <Tooltip content="设置" emoji="⚙️">
              <button
                onClick={handleOpenSettings}
                className="p-3 hover:bg-white/70 dark:hover:bg-gray-700/70 rounded-xl transition-colors shadow-sm"
              >
                <Settings className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* 录音控制区域 */}
        <div className="text-center mb-8 flex-shrink-0">
          <Tooltip content={micProps.tooltip}>
            <button
              onClick={(e) => {
                if (handleClick(e)) {
                  toggleRecording();
                }
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`${micProps.className} non-draggable shadow-lg`}
              disabled={micState === "processing"}
              style={{
                cursor: micState === "processing" ? "not-allowed" : "pointer",
              }}
            >
              {/* 动态内容基于状态 */}
              {micState === "idle" || micState === "hover" ? (
                <SoundWaveIcon size={20} isActive={micState === "hover"} />
              ) : micState === "recording" ? (
                <Mic className="w-7 h-7 text-white drop-shadow-lg" />
              ) : micState === "processing" ? (
                <VoiceWaveIndicator isListening={true} />
              ) : micState === "optimizing" ? (
                <div className="text-white text-lg">🤖</div>
              ) : null}

              {/* 录音状态指示环 */}
              {micState === "recording" && (
                <div className="absolute inset-0 rounded-full border-2 border-red-300 animate-ping"></div>
              )}

              {/* 处理状态指示环 */}
              {micState === "processing" && (
                <div className="absolute inset-0 rounded-full border-2 border-blue-300 opacity-50"></div>
              )}

              {/* AI优化状态指示环 */}
              {micState === "optimizing" && (
                <div className="absolute inset-0 rounded-full border-2 border-emerald-300 animate-pulse"></div>
              )}
            </button>
          </Tooltip>
          
          <p className="mt-4 status-text text-gray-700 dark:text-gray-300">
            {micState === "recording"
              ? "🔴 正在录音，再次点击停止"
              : micState === "processing"
              ? modelStatus.isReady
                ? "⚡ 正在识别语音..."
                : "⚡ 正在识别语音...（首次使用需要下载模型，请耐心等待）"
              : micState === "optimizing"
              ? "🤖 AI正在优化文本，请稍候..."
              : modelStatus.isReady
              ? `🎤 点击麦克风或按 ${hotkey} 开始录音`
              : modelStatus.isLoading
              ? "🤖 AI模型加载中，请稍候..."
              : modelStatus.error
              ? "❌ 模型加载失败，请检查网络连接"
              : `🎤 点击麦克风或按 ${hotkey} 开始录音（首次使用需要下载模型）`
            }
          </p>
        </div>

        {/* 文本显示区域 - 可滚动 */}
        <div className="flex-1 text-area-scroll">
          <TextDisplay
            originalText={originalText}
            processedText={processedText}
            isProcessing={isTextProcessing || isOptimizing}
            onCopy={handleCopyText}
            onExport={handleExportText}
          />
        </div>
      </div>
    </div>
  );
}