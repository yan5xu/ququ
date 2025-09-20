#!/usr/bin/env node

/**
 * 蛐蛐文本插入功能测试脚本
 * 用于测试新的 accessibility 和文本插入功能
 */

const { spawn } = require('child_process');

console.log('🧪 蛐蛐文本插入功能测试');
console.log('================================');

// 测试 osascript 是否可用
function testOsascript() {
  return new Promise((resolve) => {
    console.log('📋 测试 osascript 可用性...');
    
    const testProcess = spawn('osascript', ['-e', 'return "test"']);
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ osascript 可用');
        resolve(true);
      } else {
        console.log('❌ osascript 不可用');
        resolve(false);
      }
    });
    
    testProcess.on('error', () => {
      console.log('❌ osascript 命令未找到');
      resolve(false);
    });
  });
}

// 测试 accessibility 权限
function testAccessibilityPermissions() {
  return new Promise((resolve) => {
    console.log('🔐 测试 accessibility 权限...');
    
    const testProcess = spawn('osascript', [
      '-e',
      'tell application "System Events" to get name of first process'
    ]);
    
    let output = '';
    let error = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Accessibility 权限已授予');
        console.log(`   前台应用: ${output.trim()}`);
        resolve(true);
      } else {
        console.log('❌ Accessibility 权限未授予');
        console.log(`   错误: ${error.trim()}`);
        resolve(false);
      }
    });
  });
}

// 测试 AXManualAccessibility 设置
function testAXManualAccessibility() {
  return new Promise((resolve) => {
    console.log('⚙️  测试 AXManualAccessibility 设置...');
    
    const script = `
      ObjC.import("Cocoa");
      try {
        let app = $.NSRunningApplication.currentApplication;
        let pid = app.processIdentifier;
        let axApp = $.AXUIElementCreateApplication(pid);
        let result = $.AXUIElementSetAttributeValue(axApp, "AXManualAccessibility", true);
        return result === 0 ? "success" : "failed";
      } catch (e) {
        return "error: " + e.toString();
      }
    `;
    
    const testProcess = spawn('osascript', ['-l', 'JavaScript', '-e', script]);
    
    let output = '';
    let error = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (code === 0 && output.trim() === 'success') {
        console.log('✅ AXManualAccessibility 设置成功');
        resolve(true);
      } else {
        console.log('❌ AXManualAccessibility 设置失败');
        console.log(`   输出: ${output.trim()}`);
        console.log(`   错误: ${error.trim()}`);
        resolve(false);
      }
    });
  });
}

// 测试文本插入到活跃应用
function testTextInsertion() {
  return new Promise((resolve) => {
    console.log('📝 测试文本插入功能...');
    console.log('   请确保有一个文本编辑器打开并处于焦点状态');
    console.log('   将在 3 秒后插入测试文本...');
    
    setTimeout(() => {
      const testText = '蛐蛐文本插入测试 - ' + new Date().toLocaleString();
      
      const script = `
        ObjC.import("Cocoa");
        
        try {
          // 获取当前活跃的应用
          let frontApp = $.NSWorkspace.sharedWorkspace.frontmostApplication;
          let pid = frontApp.processIdentifier;
          let axApp = $.AXUIElementCreateApplication(pid);
          
          // 获取焦点元素
          let focusedElement = {};
          let result = $.AXUIElementCopyAttributeValue(axApp, "AXFocusedUIElement", focusedElement);
          
          if (result === 0 && focusedElement.value) {
            // 插入文本
            let textToInsert = "${testText}";
            let cfString = $.CFStringCreateWithCString($.kCFAllocatorDefault, textToInsert, $.kCFStringEncodingUTF8);
            
            // 尝试设置选中的文本
            let insertResult = $.AXUIElementSetAttributeValue(focusedElement.value, "AXSelectedText", cfString);
            
            if (insertResult === 0) {
              return "success";
            } else {
              // 如果直接插入失败，尝试设置值
              let valueResult = $.AXUIElementSetAttributeValue(focusedElement.value, "AXValue", cfString);
              return valueResult === 0 ? "success" : "failed";
            }
          }
          
          return "no_focus";
        } catch (e) {
          return "error: " + e.toString();
        }
      `;
      
      const testProcess = spawn('osascript', ['-l', 'JavaScript', '-e', script]);
      
      let output = '';
      let error = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      testProcess.on('close', (code) => {
        const result = output.trim();
        
        if (code === 0 && result === 'success') {
          console.log('✅ 文本插入成功');
          console.log(`   插入的文本: "${testText}"`);
          resolve(true);
        } else if (result === 'no_focus') {
          console.log('⚠️  没有找到焦点元素');
          console.log('   请确保有文本编辑器打开并处于焦点状态');
          resolve(false);
        } else {
          console.log('❌ 文本插入失败');
          console.log(`   输出: ${result}`);
          console.log(`   错误: ${error.trim()}`);
          resolve(false);
        }
      });
    }, 3000);
  });
}

// 主测试函数
async function runTests() {
  console.log('开始测试...\n');
  
  if (process.platform !== 'darwin') {
    console.log('❌ 此测试仅适用于 macOS 平台');
    return;
  }
  
  const osascriptAvailable = await testOsascript();
  if (!osascriptAvailable) {
    console.log('❌ osascript 不可用，无法继续测试');
    return;
  }
  
  console.log('');
  const accessibilityGranted = await testAccessibilityPermissions();
  if (!accessibilityGranted) {
    console.log('\n⚠️  请授予 accessibility 权限后重新运行测试');
    console.log('   系统设置 → 隐私与安全性 → 辅助功能');
    return;
  }
  
  console.log('');
  const axManualSet = await testAXManualAccessibility();
  
  console.log('');
  const textInserted = await testTextInsertion();
  
  console.log('\n================================');
  console.log('📊 测试结果汇总:');
  console.log(`   osascript 可用: ${osascriptAvailable ? '✅' : '❌'}`);
  console.log(`   Accessibility 权限: ${accessibilityGranted ? '✅' : '❌'}`);
  console.log(`   AXManualAccessibility: ${axManualSet ? '✅' : '❌'}`);
  console.log(`   文本插入: ${textInserted ? '✅' : '❌'}`);
  
  if (osascriptAvailable && accessibilityGranted && axManualSet && textInserted) {
    console.log('\n🎉 所有测试通过！文本插入功能应该可以正常工作。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查相关配置。');
  }
}

// 运行测试
runTests().catch(console.error);