import { useState, useCallback } from "react";

export const usePermissions = (showAlertDialog) => {
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [accessibilityPermissionGranted, setAccessibilityPermissionGranted] = useState(false);

  const requestMicPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionGranted(true);
      if (showAlertDialog) {
        showAlertDialog({
          title: "✅ 麦克风权限测试成功",
          description: "麦克风权限正常工作！现在可以进行语音录制了。"
        });
      } else {
        alert("✅ 麦克风权限正常工作！现在可以进行语音录制了。");
      }
    } catch (err) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '麦克风权限被拒绝:', err);
      }
      setMicPermissionGranted(false);
      if (showAlertDialog) {
        showAlertDialog({
          title: "❌ 需要麦克风权限",
          description: "请授予麦克风权限以使用语音转录功能。"
        });
      } else {
        alert("❌ 需要麦克风权限！请授予麦克风权限以使用语音转录功能。");
      }
    }
  }, [showAlertDialog]);

  const testAccessibilityPermission = useCallback(async () => {
    try {
      await window.electronAPI.pasteText("蛐蛐辅助功能测试");
      setAccessibilityPermissionGranted(true);
      if (showAlertDialog) {
        showAlertDialog({
          title: "✅ 辅助功能权限测试成功",
          description: "辅助功能权限正常工作！请检查测试文本是否出现在其他应用中。"
        });
      } else {
        alert("✅ 辅助功能权限正常工作！请检查测试文本是否出现在其他应用中。");
      }
    } catch (err) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '辅助功能权限测试失败:', err);
      }
      setAccessibilityPermissionGranted(false);
      if (showAlertDialog) {
        showAlertDialog({
          title: "❌ 需要辅助功能权限",
          description: "请在系统设置中授予辅助功能权限，以启用自动文本粘贴功能。"
        });
      } else {
        alert("❌ 需要辅助功能权限！请在系统设置中授予权限。");
      }
    }
  }, [showAlertDialog]);

  return {
    micPermissionGranted,
    accessibilityPermissionGranted,
    requestMicPermission,
    testAccessibilityPermission,
    setMicPermissionGranted,
    setAccessibilityPermissionGranted,
  };
};