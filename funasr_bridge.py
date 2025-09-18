#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FunASR桥接脚本
用于在Electron应用中调用FunASR进行中文语音识别
"""

import sys
import json
import os
import logging
import traceback
import tempfile
import argparse
from pathlib import Path

# 设置日志 - 只输出到文件，不输出到stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('funasr_bridge.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

class FunASRBridge:
    def __init__(self):
        self.asr_model = None
        self.vad_model = None
        self.punc_model = None
        self.initialized = False
        
    def initialize(self):
        """初始化FunASR模型"""
        try:
            from funasr import AutoModel
            
            logger.info("正在初始化FunASR模型...")
            
            # 初始化语音识别模型 (Paraformer-large)
            self.asr_model = AutoModel(
                model="damo/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
                model_revision="v2.0.4",
                disable_update=True  # 禁用自动更新检查
            )
            logger.info("语音识别模型初始化完成")
            
            # 初始化VAD模型
            self.vad_model = AutoModel(
                model="damo/speech_fsmn_vad_zh-cn-16k-common-pytorch",
                model_revision="v2.0.4",
                disable_update=True  # 禁用自动更新检查
            )
            logger.info("VAD模型初始化完成")
            
            # 初始化标点恢复模型
            self.punc_model = AutoModel(
                model="damo/punc_ct-transformer_zh-cn-common-vocab272727-pytorch",
                model_revision="v2.0.4",
                disable_update=True  # 禁用自动更新检查
            )
            logger.info("标点恢复模型初始化完成")
            
            self.initialized = True
            return {"success": True, "message": "FunASR模型初始化成功"}
            
        except ImportError as e:
            error_msg = "FunASR未安装，请先安装FunASR: pip install funasr"
            logger.error(error_msg)
            return {"success": False, "error": error_msg, "type": "import_error"}
            
        except Exception as e:
            error_msg = f"FunASR模型初始化失败: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return {"success": False, "error": error_msg, "type": "init_error"}
    
    def transcribe_audio(self, audio_path, options=None):
        """转录音频文件"""
        if not self.initialized:
            init_result = self.initialize()
            if not init_result["success"]:
                return init_result
        
        try:
            # 检查音频文件是否存在
            if not os.path.exists(audio_path):
                return {"success": False, "error": f"音频文件不存在: {audio_path}"}
            
            logger.info(f"开始转录音频文件: {audio_path}")
            
            # 设置默认选项
            default_options = {
                "batch_size_s": 300,
                "hotword": "",
                "use_vad": True,
                "use_punc": True,
                "language": "zh"
            }
            
            if options:
                default_options.update(options)
            
            # 执行语音识别
            if default_options["use_vad"]:
                # 使用VAD进行语音端点检测
                vad_result = self.vad_model.generate(
                    input=audio_path,
                    batch_size_s=default_options["batch_size_s"]
                )
                logger.info("VAD处理完成")
            
            # 执行ASR识别
            asr_result = self.asr_model.generate(
                input=audio_path,
                batch_size_s=default_options["batch_size_s"],
                hotword=default_options["hotword"]
            )
            
            # 提取识别文本
            if isinstance(asr_result, list) and len(asr_result) > 0:
                if isinstance(asr_result[0], dict) and "text" in asr_result[0]:
                    raw_text = asr_result[0]["text"]
                else:
                    raw_text = str(asr_result[0])
            else:
                raw_text = str(asr_result)
            
            logger.info(f"ASR识别完成，原始文本: {raw_text[:100]}...")
            
            # 标点恢复
            final_text = raw_text
            if default_options["use_punc"] and self.punc_model and raw_text.strip():
                try:
                    punc_result = self.punc_model.generate(input=raw_text)
                    if isinstance(punc_result, list) and len(punc_result) > 0:
                        if isinstance(punc_result[0], dict) and "text" in punc_result[0]:
                            final_text = punc_result[0]["text"]
                        else:
                            final_text = str(punc_result[0])
                    logger.info("标点恢复完成")
                except Exception as e:
                    logger.warning(f"标点恢复失败，使用原始文本: {str(e)}")
            
            result = {
                "success": True,
                "text": final_text,
                "raw_text": raw_text,
                "confidence": getattr(asr_result[0], 'confidence', 0.0) if isinstance(asr_result, list) else 0.0,
                "duration": self._get_audio_duration(audio_path),
                "language": "zh-CN"
            }
            
            logger.info(f"转录完成，最终文本: {final_text[:100]}...")
            return result
            
        except Exception as e:
            error_msg = f"音频转录失败: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return {"success": False, "error": error_msg, "type": "transcription_error"}
    
    def _get_audio_duration(self, audio_path):
        """获取音频时长"""
        try:
            import librosa
            duration = librosa.get_duration(filename=audio_path)
            return duration
        except:
            return 0.0
    
    def check_status(self):
        """检查FunASR状态"""
        try:
            import funasr
            return {
                "success": True,
                "installed": True,
                "initialized": self.initialized,
                "version": getattr(funasr, '__version__', 'unknown'),
                "models": {
                    "asr": self.asr_model is not None,
                    "vad": self.vad_model is not None,
                    "punc": self.punc_model is not None
                }
            }
        except ImportError:
            return {
                "success": False,
                "installed": False,
                "initialized": False,
                "error": "FunASR未安装"
            }
    
    def process_realtime_audio(self, audio_chunks):
        """处理实时音频流（未来功能）"""
        # TODO: 实现实时语音识别
        return {"success": False, "error": "实时识别功能尚未实现"}

# 全局单例实例，避免重复初始化
_global_bridge = None

def get_bridge():
    """获取全局FunASR桥接实例"""
    global _global_bridge
    if _global_bridge is None:
        _global_bridge = FunASRBridge()
    return _global_bridge

def main():
    parser = argparse.ArgumentParser(description='FunASR桥接脚本')
    parser.add_argument('command', choices=['init', 'transcribe', 'status'], help='执行的命令')
    parser.add_argument('--audio', help='音频文件路径')
    parser.add_argument('--options', help='JSON格式的选项')
    
    args = parser.parse_args()
    
    # 使用全局单例实例
    bridge = get_bridge()
    
    try:
        if args.command == 'init':
            result = bridge.initialize()
        elif args.command == 'transcribe':
            if not args.audio:
                result = {"success": False, "error": "缺少音频文件路径"}
            else:
                options = json.loads(args.options) if args.options else None
                result = bridge.transcribe_audio(args.audio, options)
        elif args.command == 'status':
            result = bridge.check_status()
        else:
            result = {"success": False, "error": f"未知命令: {args.command}"}
        
        # 输出JSON结果
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()