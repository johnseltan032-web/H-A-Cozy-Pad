import { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../lib/api';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatMessagesEndRef = useRef(null);
  const suggestedQuestions = [
    'How do I book a stay?',
    'How can I list my property?',
    'What is the cancellation policy?',
  ];

  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const sendMessage = async (messageText) => {
    const text = messageText.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-user`, text, sender: 'user' },
    ]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user: 'guest-user',
          conversation_id: conversationId,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to contact customer support.');
      }

      setConversationId(data.conversation_id || '');
      setMessages((prev) => [
        ...prev,
        {
          id: data.message_id || `${Date.now()}-bot`,
          text: data.answer || 'I could not find an answer. Please try again.',
          sender: 'bot',
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          text: error.message || 'Unable to contact customer support.',
          sender: 'bot',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-black text-white shadow-lg flex items-center justify-center hover:bg-neutral-800 z-50 cursor-pointer border-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
        </button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[340px] h-[480px] bg-[#f2f2f2] border border-neutral-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-300 bg-[#f2f2f2]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-neutral-300 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-500" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold leading-tight">CozyBot</p>
                <p className="mt-0.5 text-xs text-neutral-500">H&amp;A Cozy Pad support</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="w-7 h-7 rounded-full border border-neutral-400 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 bg-transparent cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="mt-2 rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-sm font-semibold text-neutral-900">
                  Welcome to H&amp;A Cozy Pad
                </p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                  I can help with bookings, stays, and hosting your property.
                </p>
                <div className="mt-4 flex flex-col items-start gap-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => sendMessage(question)}
                      disabled={isLoading}
                      className="max-w-full rounded-full border border-neutral-300 bg-white px-3 py-2 text-left text-xs text-neutral-700 transition-colors hover:border-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className="w-8 h-8 shrink-0 rounded-full bg-neutral-300 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-neutral-500" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                  </svg>
                </div>
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user' ? 'bg-black text-white' : 'bg-white text-black border border-neutral-200'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <p className="text-sm text-neutral-500" role="status">
                H&A Cozy Pad is replying...
              </p>
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-neutral-300 bg-[#f2f2f2]">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white border border-neutral-300 rounded-full px-4 py-2.5">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about bookings or hosting"
                aria-label="Message CozyBot"
                autoComplete="off"
                disabled={isLoading}
                className="w-full bg-transparent border-none outline-none text-base"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={isLoading || !inputValue.trim()}
                className="w-8 h-8 shrink-0 rounded-full bg-black flex items-center justify-center hover:bg-neutral-800 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 12l14-8-6 8 6 8z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}