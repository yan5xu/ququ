import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Download, Clock } from 'lucide-react';

/**
 * 模型状态指示器组件
 * 显示FunASR模型的下载、加载状态
 */
export const ModelStatusIndicator = ({ modelStatus, className = "", onDownload = null }) => {
  const getStatusIcon = () => {
    switch (modelStatus.stage) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500 model-loading" />;
      case 'need_download':
        return <Download className="w-4 h-4 text-orange-500" />;
      case 'downloading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500 model-downloading" />;
      case 'loading':
        return <Clock className="w-4 h-4 text-blue-500 model-loading" />;
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500 model-ready" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500 model-error" />;
      default:
        return <Download className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (modelStatus.stage) {
      case 'checking':
        return "检查模型状态...";
      case 'need_download':
        return "需要下载模型";
      case 'downloading':
        return "正在下载模型...";
      case 'loading':
        return "模型加载中...";
      case 'ready':
        return "模型已就绪";
      case 'error':
        return "模型错误";
      default:
        return "模型状态未知";
    }
  };

  const getStatusColor = () => {
    switch (modelStatus.stage) {
      case 'checking':
      case 'downloading':
      case 'loading':
        return "text-blue-600";
      case 'need_download':
        return "text-orange-600";
      case 'ready':
        return "text-green-600";
      case 'error':
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getProgressText = () => {
    if (modelStatus.isDownloading && modelStatus.downloadProgress > 0) {
      return `${modelStatus.downloadProgress}%`;
    }
    if (modelStatus.isLoading && modelStatus.progress > 0) {
      return `${modelStatus.progress}%`;
    }
    return null;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {getProgressText() && (
        <span className="text-xs text-gray-500">
          ({getProgressText()})
        </span>
      )}
      {modelStatus.stage === 'need_download' && onDownload && (
        <button
          onClick={onDownload}
          className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          下载
        </button>
      )}
    </div>
  );
};

/**
 * 简化的模型状态图标组件
 * 仅显示图标，用于空间受限的地方
 */
export const ModelStatusIcon = ({ modelStatus, size = "w-5 h-5", showTooltip = true }) => {
  const getStatusIcon = () => {
    switch (modelStatus.stage) {
      case 'checking':
        return <Loader2 className={`${size} animate-spin text-blue-500 model-loading`} />;
      case 'need_download':
        return <Download className={`${size} text-orange-500`} />;
      case 'downloading':
        return <Loader2 className={`${size} animate-spin text-blue-500 model-downloading`} />;
      case 'loading':
        return <Clock className={`${size} text-blue-500 model-loading`} />;
      case 'ready':
        return <CheckCircle className={`${size} text-green-500 model-ready`} />;
      case 'error':
        return <AlertCircle className={`${size} text-red-500 model-error`} />;
      default:
        return <Download className={`${size} text-gray-500`} />;
    }
  };

  const getTooltipText = () => {
    switch (modelStatus.stage) {
      case 'checking':
        return "🔍 正在检查模型状态...";
      case 'need_download':
        return "📥 需要下载AI模型文件（约1.1GB）";
      case 'downloading':
        return `⬇️ 正在下载模型文件... ${modelStatus.downloadProgress || 0}%`;
      case 'loading':
        return "🤖 AI模型加载中，请稍候...";
      case 'ready':
        return "✅ AI模型已就绪，可以开始语音识别";
      case 'error':
        return `❌ 模型错误: ${modelStatus.error || '未知错误'}`;
      default:
        return "⏳ 模型状态未知";
    }
  };

  const icon = getStatusIcon();

  if (!showTooltip) {
    return icon;
  }

  return (
    <div className="relative group">
      {icon}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-white model-status-tooltip rounded-lg whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
        <span className="text-xs font-medium">{getTooltipText()}</span>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/85"></div>
      </div>
    </div>
  );
};

/**
 * 模型下载进度组件
 * 显示详细的下载进度信息
 */
export const ModelDownloadProgress = ({ modelStatus, onDownload, onCancel }) => {
  if (modelStatus.stage === 'need_download') {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Download className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                需要下载AI模型
              </h3>
              <p className="text-xs text-orange-600 dark:text-orange-300">
                首次使用需要下载约1.1GB的模型文件
              </p>
            </div>
          </div>
          <button
            onClick={onDownload}
            disabled={modelStatus.isDownloading}
            className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium ${
              modelStatus.isDownloading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {modelStatus.isDownloading ? '准备下载...' : '开始下载'}
          </button>
        </div>
      </div>
    );
  }

  if (modelStatus.stage === 'downloading') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  正在下载模型文件
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  请保持网络连接，下载可能需要几分钟
                </p>
              </div>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                取消
              </button>
            )}
          </div>
          
          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-blue-600 dark:text-blue-300">
              <span>下载进度</span>
              <span>{modelStatus.downloadProgress || 0}%</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${modelStatus.downloadProgress || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};