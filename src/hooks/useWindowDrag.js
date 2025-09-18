import { useState, useCallback, useRef } from 'react';

/**
 * 窗口拖拽Hook
 * 处理窗口拖拽功能
 */
export const useWindowDrag = () => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    
    // 在Electron环境中启用窗口拖拽
    if (window.electronAPI) {
      // CSS的-webkit-app-region: drag已经在draggable类中设置
      // 这里我们只需要跟踪拖拽状态
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
      const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
      
      // 如果鼠标移动超过5像素，认为是拖拽
      if (deltaX > 5 || deltaY > 5) {
        hasMoved.current = true;
      }
    }
  }, [isDragging]);

  const handleMouseUp = useCallback((e) => {
    setIsDragging(false);
    
    // 重置拖拽状态
    setTimeout(() => {
      hasMoved.current = false;
    }, 100);
  }, []);

  const handleClick = useCallback((e) => {
    // 如果发生了拖拽，阻止点击事件
    if (hasMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    return true;
  }, []);

  return {
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleClick
  };
};