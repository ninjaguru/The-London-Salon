import React, { useState, useRef, useEffect } from 'react';
import { generateAIResponse } from '../services/gemini';
import { Send, Sparkles, Bot, User } from 'lucide-react';
import { db } from '../services/db';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Salon Smart Assistant. How can I help you manage your business today? I can help with marketing ideas, inventory analysis, or client communication.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Build context from DB
    const inventory = db.inventory.getAll();
    const lowStock = inventory.filter(p => p.quantity <= p.minThreshold).map(p => p.name).join(', ');
    const salesToday = db.sales.getAll().filter(s => s.date.startsWith(new Date().toISOString().split('T')[0])).length;
    
    const context = `
      Current Salon Status:
      - Low Stock Items: ${lowStock || 'None'}
      - Sales Count Today: ${salesToday}
    `;

    const response = await generateAIResponse(userMessage, context);

    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-rose-500 p-4 text-white flex items-center shadow-sm">
        <Sparkles className="mr-2 h-6 w-6" />
        <div>
          <h2 className="text-lg font-bold">Lumière Smart Assistant</h2>
          <p className="text-xs opacity-90">Powered by Google Gemini</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-500 ml-2' : 'bg-rose-500 mr-2'}`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`p-3 rounded-lg text-sm shadow-sm whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-tl-none ml-10 shadow-sm">
               <div className="flex space-x-2">
                 <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce delay-100"></div>
                 <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce delay-200"></div>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about marketing ideas, inventory check, or business advice..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-rose-600 text-white rounded-lg px-4 py-2 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;