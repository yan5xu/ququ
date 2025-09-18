import React from 'react';

/**
 * 状态灯组件
 * 使用三种颜色的圆形指示灯显示模型状态
 */
export const StatusLight = ({ modelStatus, size = "w-3 h-3", showTooltip = true }) => {
  const getLightColor = () => {
    if (modelStatus.isLoading) {
      return "bg-yellow-500"; // 黄灯 - 加载中
    }
    
    if (modelStatus.error) {
      return "bg-red-500"; // 红灯 - 错误
    }
    
    if (modelStatus.isReady) {
      return "bg-green-500"; // 绿灯 - 就绪
    }
    
    return "bg-gray-400"; // 灰灯 - 未知状态
  };

  const getLightAnimation = () => {
    if (modelStatus.isLoading) {
      return "animate-pulse"; // 黄灯闪烁
    }
    
    if (modelStatus.error) {
      return "model-error"; // 红灯闪烁
    }
    
    if (modelStatus.isReady) {
      return "model-ready"; // 绿灯脉冲
    }
    
    return "";
  };

  const getTooltipText = () => {
    if (modelStatus.isLoading) {
      return "🟡 模型加载中";
    }
    
    if (modelStatus.error) {
      return "🔴 模型加载失败";
    }
    
    if (modelStatus.isReady) {
      return "🟢 模型已就绪";
    }
    
    return "⚪ 模型状态未知";
  };

  const lightElement = (
    <div 
      className={`${size} rounded-full ${getLightColor()} ${getLightAnimation()} border border-white/30 shadow-sm`}
    />
  );

  if (!showTooltip) {
    return lightElement;
  }

  return (
    <div className="relative group">
      {lightElement}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-white model-status-tooltip rounded-md whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
        <span className="text-xs font-medium">{getTooltipText()}</span>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/85"></div>
      </div>
    </div>
  );
};