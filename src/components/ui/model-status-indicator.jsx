import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';

/**
 * 模型状态指示器组件
 * 显示FunASR模型的加载状态
 */
export const ModelStatusIndicator = ({ modelStatus, className = "" }) => {
  const getStatusIcon = () => {
    if (modelStatus.isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500 model-loading" />;
    }
    
    if (modelStatus.error) {
      return <AlertCircle className="w-4 h-4 text-red-500 model-error" />;
    }
    
    if (modelStatus.isReady) {
      return <CheckCircle className="w-4 h-4 text-green-500 model-ready" />;
    }
    
    return <Download className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (modelStatus.isLoading) {
      return "模型加载中...";
    }
    
    if (modelStatus.error) {
      return "模型加载失败";
    }
    
    if (modelStatus.isReady) {
      return "模型已就绪";
    }
    
    return "模型未加载";
  };

  const getStatusColor = () => {
    if (modelStatus.isLoading) {
      return "text-blue-600";
    }
    
    if (modelStatus.error) {
      return "text-red-600";
    }
    
    if (modelStatus.isReady) {
      return "text-green-600";
    }
    
    return "text-yellow-600";
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {modelStatus.isLoading && modelStatus.progress > 0 && (
        <span className="text-xs text-gray-500">
          ({modelStatus.progress}%)
        </span>
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
    if (modelStatus.isLoading) {
      return <Loader2 className={`${size} animate-spin text-blue-500 model-loading`} />;
    }
    
    if (modelStatus.error) {
      return <AlertCircle className={`${size} text-red-500 model-error`} />;
    }
    
    if (modelStatus.isReady) {
      return <CheckCircle className={`${size} text-green-500 model-ready`} />;
    }
    
    return <Download className={`${size} text-yellow-500`} />;
  };

  const getTooltipText = () => {
    if (modelStatus.isLoading) {
      return "🤖 AI模型加载中，首次使用需要下载模型文件";
    }
    
    if (modelStatus.error) {
      return "❌ 模型加载失败，请检查网络连接";
    }
    
    if (modelStatus.isReady) {
      return "✅ AI模型已就绪，可以开始语音识别";
    }
    
    return "⏳ 模型未加载，首次使用需要下载";
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