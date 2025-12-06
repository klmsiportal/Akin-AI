import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, AlertCircle } from 'lucide-react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`
      w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group
      ${isUser ? 'dark:bg-[#343541]' : 'bg-gray-50 dark:bg-[#444654]'}
    `}>
      <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-[38rem] xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className={`w-[30px] h-[30px] rounded-sm flex items-center justify-center ${isUser ? 'bg-purple-600' : 'bg-emerald-500'}`}>
            {isUser ? (
              <User className="h-5 w-5 text-white" />
            ) : (
              <Bot className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
        
        <div className="relative flex-1 overflow-hidden">
          {message.isError ? (
             <div className="flex items-center gap-2 text-red-400 bg-red-900/10 p-3 rounded border border-red-500/20">
                <AlertCircle className="w-5 h-5" />
                <p>Error: {message.text}</p>
             </div>
          ) : (
            <div className="prose prose-invert max-w-none leading-7">
               <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};