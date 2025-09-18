#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FunASR模型服务器
保持模型在内存中，通过stdin/stdout进行通信
"""

import sys
import json
import os
import logging
import traceback
import signal
from pathlib import Path

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('funasr_server.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

class FunASRServer:
    def __init__(self):
        self.asr_model = None
        self.vad_model = None
        self.punc_model = None
        self.initialized = False
        self.running = True
        
        # 设置信号处理
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
        
    def _signal_handler(self, signum, frame):
        """处理退出信号"""
        logger.info(f"收到信号 {signum}，准备退出...")
        self.running = False
        
    def initialize(self):
        """初始化FunASR模型"""
        if self.initialized:
            return {"success": True, "message": "模型已初始化"}
            
        try:
            from funasr import AutoModel
            
            logger.info("正在初始化FunASR模型...")
            
            # 初始化语音识别模型 (Paraformer-large)
            self.asr_model = AutoModel(
                model="damo/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
                model_revision="v2.0.4",
                disable_update=True
            )
            logger.info("语音识别模型初始化完成")
            
            # 初始化VAD模型
            self.vad_model = AutoModel(
                model="damo/speech_fsmn_vad_zh-cn-16k-common-pytorch",
                model_revision="v2.0.4",
                disable_update=True
            )
            logger.info("VAD模型初始化完成")
            
            # 标点恢复现在由AI模型处理，不再使用FunASR的标点模型
            self.punc_model = None
            logger.info("跳过标点恢复模型初始化，将使用AI进行文本优化")
            
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
                "use_punc": False,  # 不再使用FunASR的标点恢复
                "language": "zh"
            }
            
            if options:
                default_options.update(options)
            
            # 执行语音识别
            if default_options["use_vad"]:
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
            
            # 标点恢复和文本优化现在由AI模型处理
            final_text = raw_text
            logger.info("跳过FunASR标点恢复，原始文本将由AI进行优化")
            
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
                    "punc": False  # 标点恢复由AI处理
                }
            }
        except ImportError:
            return {
                "success": False,
                "installed": False,
                "initialized": False,
                "error": "FunASR未安装"
            }
    
    def run(self):
        """运行服务器主循环"""
        logger.info("FunASR服务器启动")
        
        # 立即初始化模型
        init_result = self.initialize()
        print(json.dumps(init_result, ensure_ascii=False))
        sys.stdout.flush()
        
        while self.running:
            try:
                # 读取命令
                line = sys.stdin.readline()
                if not line:
                    break
                    
                line = line.strip()
                if not line:
                    continue
                
                try:
                    command = json.loads(line)
                except json.JSONDecodeError:
                    result = {"success": False, "error": "无效的JSON命令"}
                    print(json.dumps(result, ensure_ascii=False))
                    sys.stdout.flush()
                    continue
                
                # 处理命令
                if command.get("action") == "transcribe":
                    audio_path = command.get("audio_path")
                    options = command.get("options", {})
                    result = self.transcribe_audio(audio_path, options)
                elif command.get("action") == "status":
                    result = self.check_status()
                elif command.get("action") == "exit":
                    result = {"success": True, "message": "服务器退出"}
                    print(json.dumps(result, ensure_ascii=False))
                    sys.stdout.flush()
                    break
                else:
                    result = {"success": False, "error": f"未知命令: {command.get('action')}"}
                
                # 输出结果
                print(json.dumps(result, ensure_ascii=False))
                sys.stdout.flush()
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                error_result = {
                    "success": False,
                    "error": str(e),
                    "traceback": traceback.format_exc()
                }
                print(json.dumps(error_result, ensure_ascii=False))
                sys.stdout.flush()
        
        logger.info("FunASR服务器退出")

if __name__ == "__main__":
    server = FunASRServer()
    server.run()