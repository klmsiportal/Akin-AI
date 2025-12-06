import React from 'react';
import { Plus, MessageSquare, LogOut, User as UserIcon, Trash2 } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onLogout: () => void;
  userEmail?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onLogout,
  userEmail
}) => {
  return (
    <div 
      className={`
        fixed inset-y-0 left-0 z-30 w-[260px] bg-[#202123] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <div className="flex flex-col h-full p-2">
        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-md border border-white/20 text-white text-sm hover:bg-gray-500/10 transition-colors mb-4"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>

        {/* History List */}
        <div className="flex-1 overflow-y-auto">
          <div className="text-xs font-medium text-gray-500 px-3 py-2">History</div>
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`
                group relative flex items-center gap-3 px-3 py-3 text-sm text-gray-100 rounded-md cursor-pointer hover:bg-[#2A2B32] transition-colors
                ${currentSessionId === session.id ? 'bg-[#343541]' : ''}
              `}
            >
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <div className="flex-1 truncate pr-6">
                {session.title || 'New Chat'}
              </div>
              <button
                onClick={(e) => onDeleteSession(e, session.id)}
                className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-gray-500 text-sm px-3 italic">No history yet.</div>
          )}
        </div>

        {/* User Footer */}
        <div className="border-t border-white/20 pt-2 mt-2">
            <div className="px-3 py-3 text-xs text-gray-500 text-center mb-2">
                 Created by Akin S. Sokpah
            </div>
          <div className="flex items-center gap-3 px-3 py-3 text-sm text-white hover:bg-gray-500/10 rounded-md cursor-pointer group">
            <div className="w-8 h-8 bg-purple-600 rounded-sm flex items-center justify-center">
                <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 truncate">
              {userEmail || 'User'}
            </div>
            <button onClick={onLogout} className="text-gray-400 hover:text-white" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};