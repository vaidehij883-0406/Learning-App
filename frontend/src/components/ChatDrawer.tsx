import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Announcement } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Send, Megaphone, MessageSquare, ShieldAlert, Sparkles, Pin } from 'lucide-react';

interface ChatDrawerProps {
  batchId: string;
  isEducator: boolean;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ batchId, isEducator }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'announcements'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAnnouncementToggle, setIsAnnouncementToggle] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [msgs, anns] = await Promise.all([
        api.getBatchMessages(batchId),
        api.getAnnouncements(batchId),
      ]);
      setMessages(msgs);
      setAnnouncements(anns);
    } catch (err) {
      console.error('Failed to load chat/announcements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000); // Poll every 8s for live activity
    return () => clearInterval(interval);
  }, [batchId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const sent = await api.sendMessage(batchId, inputMessage.trim(), isAnnouncementToggle);
      setMessages((prev) => [...prev, sent]);
      setInputMessage('');
      setIsAnnouncementToggle(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px] overflow-hidden">
      {/* Top Header & Tab switcher */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'chat'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Discussion
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'announcements'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            Announcements ({announcements.length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            Loading batch feed...
          </div>
        ) : activeTab === 'chat' ? (
          messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <MessageSquare className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
              <p className="text-xs font-medium">No messages yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Start the conversation with your educator and classmates!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = user?.id === m.user_id;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-slate-700">
                      {isMe ? 'You' : m.user?.full_name || 'Student'}
                    </span>
                    {m.user?.role === 'educator' && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded">
                        Educator
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      m.is_announcement
                        ? 'bg-amber-50 border border-amber-200 text-amber-900'
                        : isMe
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {m.is_announcement && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 mb-1">
                        <Pin className="w-3 h-3 fill-current" /> Pinned Announcement
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{m.message}</p>
                  </div>
                </div>
              );
            })
          )
        ) : (
          announcements.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Megaphone className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
              <p className="text-xs font-medium">No announcements published yet</p>
            </div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                    {a.title}
                  </h4>
                  <span className="text-[10px] text-amber-700">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{a.content}</p>
              </div>
            ))
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      {user ? (
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-slate-50/50">
          {isEducator && activeTab === 'chat' && (
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnnouncementToggle}
                onChange={(e) => setIsAnnouncementToggle(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Pin as Educator Announcement
            </label>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={activeTab === 'chat' ? 'Ask a question or share feedback...' : 'Educators post announcements from studio'}
              disabled={activeTab === 'announcements'}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending || activeTab === 'announcements'}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 border-t border-slate-100 text-center text-xs text-slate-500 bg-slate-50">
          Please log in to participate in batch discussion
        </div>
      )}
    </div>
  );
};
