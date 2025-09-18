import { useState, useCallback } from 'react';

/**
 * 文本处理Hook
 * 使用可配置的AI模型进行文本处理
 */
export const useTextProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // 处理文本的主要函数
  const processText = useCallback(async (text, mode = 'optimize') => {
    if (!text || text.trim().length === 0) {
      setError('文本内容不能为空');
      return null;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let result;
      
      if (window.electronAPI) {
        // 使用Electron API调用AI模型
        result = await window.electronAPI.processText(text, mode);
      } else {
        // Web环境下直接调用AI API
        result = await callAIAPI(text, mode);
      }

      if (result && result.success) {
        return result.text;
      } else {
        throw new Error(result?.error || '文本处理失败');
      }
    } catch (err) {
      const errorMessage = err.message || '文本处理过程中发生未知错误';
      setError(errorMessage);
      console.error('文本处理错误:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 直接调用AI API
  const callAIAPI = useCallback(async (text, mode) => {
    const apiKey = process.env.AI_API_KEY || localStorage.getItem('ai_api_key');
    if (!apiKey) {
      throw new Error('请先配置AI API密钥');
    }

    const prompts = {
      format: `请将以下语音识别文本进行格式化，添加适当的段落分隔和标点符号，使其更易阅读：\n\n${text}`,
      correct: `请纠正以下文本中的语法错误、错别字和语音识别错误，保持原意不变：\n\n${text}`,
      optimize: `请优化以下文本的表达，使其更加流畅、专业和易懂，去除口语化表达和冗余内容：\n\n${text}`,
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

    const baseUrl = process.env.AI_BASE_URL || localStorage.getItem('ai_base_url') || 'https://api.openai.com/v1';
    const model = process.env.AI_MODEL || localStorage.getItem('ai_model') || 'gpt-3.5-turbo';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return {
        success: true,
        text: data.choices[0].message.content.trim(),
        usage: data.usage
      };
    } else {
      throw new Error('API返回数据格式错误');
    }
  }, []);

  return {
    processText,
    isProcessing,
    error
  };
};