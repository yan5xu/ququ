#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接测试FunASR服务器的并行加载性能
"""

import time
import sys
import os

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_parallel_loading():
    """直接测试并行加载性能"""
    print("🚀 测试并行优化后的FunASR初始化")
    print("=" * 50)
    
    try:
        # 导入我们修改后的FunASR服务器
        from funasr_server import FunASRServer
        
        # 创建服务器实例
        server = FunASRServer()
        
        print("⏱️  开始计时...")
        start_time = time.time()
        
        # 执行初始化
        result = server.initialize()
        
        end_time = time.time()
        elapsed = end_time - start_time
        
        print(f"⏱️  初始化耗时: {elapsed:.2f}秒")
        print(f"📊 初始化结果: {result}")
        
        if result.get("success"):
            print("✅ 并行优化成功！")
            print(f"🎯 模型状态:")
            print(f"   - ASR模型: {'✅' if server.asr_model else '❌'}")
            print(f"   - VAD模型: {'✅' if server.vad_model else '❌'}")
            print(f"   - Punc模型: {'✅' if server.punc_model else '❌'}")
        else:
            print("❌ 初始化失败:", result.get("error", "未知错误"))
            
    except Exception as e:
        import sys
        import traceback
        # 确保输出到stderr而不是可能已关闭的stdout
        sys.stderr.write(f"❌ 测试过程中发生错误: {str(e)}\n")
        traceback.print_exc(file=sys.stderr)
    
    print("=" * 50)

if __name__ == "__main__":
    test_parallel_loading()