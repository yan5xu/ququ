import { useState, useCallback } from 'react';

/**
 * 文本处理Hook
 * 使用可配置的AI模型进行文本处理
 */
export const useTextProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // 根据文本长度自动选择处理模式
  const determineProcessingMode = useCallback((text, userMode = 'auto') => {
    if (userMode !== 'auto') {
      return userMode;
    }

    const textLength = text.trim().length;
    const wordCount = text.trim().split(/\s+/).length;

    // 长文本阈值：超过150字符或30个词
    if (textLength > 150 || wordCount > 30) {
      return 'optimize_long';
    } else {
      return 'optimize';
    }
  }, []);

  // 处理并保存转录的函数
  const handleTranscription = useCallback(async (transcriptionData, useAI) => {
    const { raw_text, duration, file_size } = transcriptionData;

    if (!raw_text || raw_text.trim().length === 0) {
      setError('转录文本内容不能为空');
      return null;
    }

    setIsProcessing(true);
    setError(null);

    let processed_text = null;
    let finalData = { ...transcriptionData, text: raw_text };

    if (useAI) {
      try {
        const actualMode = determineProcessingMode(raw_text, 'auto');
        if (window.electronAPI && window.electronAPI.log) {
          window.electronAPI.log('info', '开始AI文本优化:', {
            text: raw_text.substring(0, 50) + '...',
            mode: actualMode,
          });
        }
        
        const result = await window.electronAPI.processText(raw_text, actualMode);

        if (result && result.success) {
          processed_text = result.text;
          finalData.processed_text = processed_text;
          // 如果AI优化后的文本与原始文本不同，则将优化后的文本作为主文本
          if (processed_text && processed_text.trim() !== raw_text.trim()) {
            finalData.text = processed_text;
          }
          if (window.electronAPI && window.electronAPI.log) {
            window.electronAPI.log('info', 'AI文本优化成功', { processed_text: processed_text.substring(0, 50) + '...' });
          }
        } else {
          if (window.electronAPI && window.electronAPI.log) {
            window.electronAPI.log('error', 'AI文本优化失败:', result);
          }
          setError(result?.error || 'AI文本优化失败');
        }
      } catch (err) {
        const errorMessage = err.message || 'AI处理过程中发生未知错误';
        setError(errorMessage);
        if (window.electronAPI && window.electronAPI.log) {
          window.electronAPI.log('error', 'AI文本优化捕获到错误:', err);
        }
      }
    }

    try {
      if (window.electronAPI) {
        if (window.electronAPI && window.electronAPI.log) {
          window.electronAPI.log('info', '准备保存转录数据:', finalData);
        }
        const savedResult = await window.electronAPI.saveTranscription(finalData);
        if (window.electronAPI && window.electronAPI.log) {
          window.electronAPI.log('info', '转录数据保存成功:', savedResult);
        }
        return { ...finalData, id: savedResult.lastInsertRowid };
      }
    } catch (err) {
      const errorMessage = err.message || '保存转录数据时发生未知错误';
      setError(errorMessage);
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '保存转录数据失败:', err);
      }
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [determineProcessingMode]);

  // 直接调用AI API
  const callAIAPI = useCallback(async (text, mode) => {
    // 优先从Electron API获取设置，然后是localStorage，最后是环境变量
    let apiKey, baseUrl, model;
    
    if (window.electronAPI) {
      try {
        apiKey = await window.electronAPI.getSetting('ai_api_key');
        baseUrl = await window.electronAPI.getSetting('ai_base_url') || 'https://api.openai.com/v1';
        model = await window.electronAPI.getSetting('ai_model') || 'gpt-3.5-turbo';
      } catch (error) {
        // 如果获取设置失败，回退到localStorage
        apiKey = localStorage.getItem('ai_api_key');
        baseUrl = localStorage.getItem('ai_base_url') || 'https://api.openai.com/v1';
        model = localStorage.getItem('ai_model') || 'gpt-3.5-turbo';
      }
    } else {
      // Web环境下使用localStorage
      apiKey = localStorage.getItem('ai_api_key');
      baseUrl = localStorage.getItem('ai_base_url') || 'https://api.openai.com/v1';
      model = localStorage.getItem('ai_model') || 'gpt-3.5-turbo';
    }
    
    if (!apiKey) {
      throw new Error('请先在设置页面配置AI API密钥');
    }

    const prompts = {
      format: `请将以下语音识别文本进行格式化，添加适当的段落分隔和标点符号，使其更易阅读：\n\n${text}`,
      correct: `请纠正以下文本中的语法错误、错别字和语音识别错误，保持原意不变：\n\n${text}`,
      optimize: `# 角色与目标
你是一个专业的语音转录文本优化助手，任务是对由ASR（自动语音识别）生成的初步文本进行精细的、最小化的润色。你的核心目标是去除言语组织过程中的干扰性噪音，同时100%保留说话人的原始意图、个人风格和口语习惯。

# 核心原则
- **最小化修改**：只处理明确的、非内容性的言语错误。
- **保留原貌**：最大限度地保留用户的原始用词、句式和语气。
- **可读性优先**：在不改变原意的前提下，提升文本的流畅性和可读性。
- **歧义时保守**：当不确定一个词或一句话是否需要修改时，必须选择保持原样。

# 明确的优化指令 (Do's)
1.  **纠正明显的拼写和语法错误**：修正同音错字、标点误用、以及基础的语法搭配错误（如主谓不一致）。
2.  **移除无意义的填充词**：删除如"呃"、"嗯"、"啊这"、"那个"、"内个"、"然后那个"、"就是说"等在思考或停顿时使用的、不承载实际信息的词语。
3.  **处理重复与口吃**：合并无意义的重复词语。
    -   例子1: "我我我觉得" -> "我觉得"
    -   例子2: "这个这个方案" -> "这个方案"
4.  **整合自我修正**：当用户明确表达了修正意图时，保留修正后的最终内容，并移除被修正的错误部分。
    -   例子1: "会议定在周三，呃不对，是周四" -> "会议定在周四"
    -   例子2: "他的名字是小明，哦我想起来了，是小强" -> "他的名字是小强"

# 严格的禁止项 (Don'ts)
1.  **禁止风格转换**：绝不能将口语化的表达（如"录个影"、"蛮不错"）替换为更书面化的词语（如"录制视频"、"非常好"）。
2.  **禁止替换用词**：除非是明显的错别字，否则不能改变用户的任何用词选择。
3.  **禁止改变句式**：不能为了"优化"而重组用户的句子结构，例如将主动句改为被动句。
4.  **禁止增删情感或语气词**：必须保留所有表达情感和语气的词，如"啊"、"呀"、"呢"、"吧"、"嘛"、"哦"、"喔"等。注意区分它们和第2条指令中提到的"无意义填充词"。
5.  **禁止主观臆断**：不能添加任何原始文本中不存在的信息，或基于猜测去"完善"句子。

原始文本：
\`\`\`
${text}
\`\`\`

直接返回优化后的文本，不要包含任何解释、前言或总结。`,
      optimize_long: `# 角色与目标
你是一个专业的长文本整理助手，专门处理语音转录的长段内容。你的任务是清理口语化的思考过程，并对内容进行逻辑分段，让文本更加清晰易读。

# 处理重点
这是一段较长的语音转录内容，通常包含完整的思考过程。你需要：

## 1. 清理口语化的思考过程
- **去除思考痕迹**：删除"然后"、"就是说"、"其实"、"比如说"、"怎么说呢"、"应该是"等思考过程中的冗余表达
- **处理话题跳转**：整理"对了"、"还有"、"另外"等突然转换话题的表达
- **清理重复表述**：去除同一观点的多次重复表达，保留最清晰的一次
- **整合修正表达**：当有"不对，我的意思是"、"更准确地说"等自我纠正时，保留最终的正确表达

## 2. 智能分段
- **识别逻辑转折点**：在话题转换、观点变化、举例说明等地方进行分段
- **保持逻辑完整性**：确保每段都有完整的逻辑表达
- **适度分段**：避免过短或过长的段落，保持阅读节奏

## 3. 保持原意和自然性
- **不改变表达风格**：保持原有的用词习惯和表达方式
- **不添加新内容**：绝不添加原文中没有的信息
- **保留重要细节**：确保例子、数据、具体描述都得到保留

原始文本：
\`\`\`
${text}
\`\`\`

请直接返回清理后并分段的文本，不要包含任何解释或说明。`,
      summarize: `请总结以下文本的主要内容，提取关键信息：\n\n${text}`,
      asr_enhance: `请对以下语音识别原始文本进行谨慎优化，重点是纠错而非改写：

**优化原则（按重要性排序）：**
1. **严格保持原意和语义不变** - 这是最重要的原则
2. 纠正明显的语音识别错误（如同音字错误：晴/情、到/道等）
3. 添加必要的标点符号，但不改变句子结构
4. 保留原文的语言风格（包括古诗词、方言、口语等）
5. 如果是诗词、成语、俗语等固定表达，请保持原样

**特别注意：**
- 对于可能是诗词、成语、俗语的内容，优先保持原有表达
- 同音字替换时要考虑上下文语义
- 宁可保守处理，也不要过度修改

原始文本：
${text}

请直接返回优化后的文本，不需要解释过程。`
    };

    // baseUrl和model已经在上面获取了

    const requestData = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompts[mode] || prompts.optimize
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: false
    };

    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log('info', '前端AI文本处理请求:', {
        baseUrl,
        model,
        mode,
        inputText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        requestData
      });
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '前端AI API请求失败:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
      }
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    if (window.electronAPI && window.electronAPI.log) {
      window.electronAPI.log('info', '前端AI文本处理响应:', {
        status: response.status,
        data: data,
        usage: data.usage
      });
    }
    
    if (data.choices && data.choices.length > 0) {
      const result = {
        success: true,
        text: data.choices[0].message.content.trim(),
        usage: data.usage
      };
      
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('info', '前端AI文本处理结果:', {
          originalText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          optimizedText: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
          usage: result.usage
        });
      }
      
      return result;
    } else {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('error', '前端AI API返回数据格式错误:', data);
      }
      throw new Error('API返回数据格式错误');
    }
  }, []);

  return {
    handleTranscription,
    isProcessing,
    error
  };
};