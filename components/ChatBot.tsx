
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { askGemini } from '../services/geminiService';

const ChatbotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface ChatBotProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const ChatBot: React.FC<ChatBotProps> = ({ messages, setMessages }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading) return;

    const question = userInput;
    const newMessages: ChatMessage[] = [...messages, { sender: 'user', text: question }];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    try {
        const history = newMessages.slice(0, -1).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

        const responseText = await askGemini(history, question, isThinkingMode);
        
        setMessages(prev => [...prev, { sender: 'gemini', text: responseText }]);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
        setMessages(prev => [...prev, { sender: 'gemini', text: errorMessage, isError: true }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label={isOpen ? "Fermer le chat" : "Ouvrir le chat"}
        >
         {isOpen ? <CloseIcon /> : <ChatbotIcon />}
        </button>
      </div>

      {isOpen && (
        <div className="fixed bottom-20 right-5 w-full max-w-sm h-[60vh] bg-white rounded-lg shadow-2xl flex flex-col z-50 transform transition-all duration-300 ease-out origin-bottom-right">
          <header className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold text-lg">Assistant BEEBOX</h3>
          </header>

          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    msg.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : msg.isError
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start mb-3">
                 <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-gray-200 text-gray-800">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
                    </div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Posez votre question..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading}
                className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
             <div className="flex items-center mt-2 pl-2">
                <input
                    type="checkbox"
                    id="thinking-mode"
                    checked={isThinkingMode}
                    onChange={(e) => setIsThinkingMode(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="thinking-mode" className="ml-2 block text-xs text-gray-600 cursor-pointer">
                    Mode réflexion (pour les requêtes complexes)
                </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
