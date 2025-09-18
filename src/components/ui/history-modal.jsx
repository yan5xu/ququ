import React, { useState, useEffect } from "react";
import { X, Copy, Trash2, Search, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";

const HistoryModal = ({ isOpen, onClose, onCopy }) => {
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTranscriptions, setFilteredTranscriptions] = useState([]);

  // 加载转录历史
  const loadTranscriptions = async () => {
    if (!window.electronAPI) return;
    
    setLoading(true);
    try {
      const result = await window.electronAPI.getTranscriptions(100, 0);
      setTranscriptions(result || []);
      setFilteredTranscriptions(result || []);
    } catch (error) {
      console.error("加载历史记录失败:", error);
      toast.error("加载历史记录失败");
    } finally {
      setLoading(false);
    }
  };

  // 搜索功能
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTranscriptions(transcriptions);
    } else {
      const filtered = transcriptions.filter(item => 
        item.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.processed_text?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTranscriptions(filtered);
    }
  }, [searchQuery, transcriptions]);

  // 当模态框打开时加载数据
  useEffect(() => {
    if (isOpen) {
      loadTranscriptions();
    }
  }, [isOpen]);

  // 删除转录记录
  const handleDelete = async (id) => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI.deleteTranscription(id);
      setTranscriptions(prev => prev.filter(item => item.id !== id));
      toast.success("记录已删除");
    } catch (error) {
      console.error("删除记录失败:", error);
      toast.error("删除记录失败");
    }
  };

  // 复制文本
  const handleCopy = async (text) => {
    try {
      if (onCopy) {
        await onCopy(text);
      } else if (window.electronAPI) {
        await window.electronAPI.copyText(text);
        toast.success("文本已复制到剪贴板");
      }
    } catch (error) {
      toast.error("复制失败");
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 2) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays <= 7) {
      return `${diffDays - 1}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900 chinese-title">转录历史</h2>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {filteredTranscriptions.length} 条记录
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="p-6 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索转录内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent chinese-text"
            />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">加载中...</span>
            </div>
          ) : filteredTranscriptions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 chinese-text">
                {searchQuery ? "没有找到匹配的记录" : "暂无转录历史"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTranscriptions.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(item.created_at)}</span>
                      {item.confidence && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                          置信度: {Math.round(item.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCopy(item.processed_text || item.text)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="复制文本"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="删除记录"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* 原始文本 */}
                  {item.text && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">原始识别:</h4>
                      <p className="text-gray-900 chinese-content leading-relaxed bg-white p-3 rounded border">
                        {item.text}
                      </p>
                    </div>
                  )}

                  {/* AI优化文本 */}
                  {item.processed_text && item.processed_text !== item.text && (
                    <div>
                      <h4 className="text-sm font-medium text-emerald-700 mb-1">AI优化:</h4>
                      <p className="text-gray-900 chinese-content leading-relaxed bg-emerald-50 p-3 rounded border border-emerald-200">
                        {item.processed_text}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        {filteredTranscriptions.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                共 {filteredTranscriptions.length} 条记录
              </p>
              <button
                onClick={() => {
                  if (window.electronAPI) {
                    window.electronAPI.exportTranscriptions('txt');
                    toast.success("导出功能已触发");
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                导出全部
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryModal;