import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, User } from 'lucide-react';

// Exact markdown formatter translated from the backup
function formatMarkdown(text) {
  if (!text) return '';

  // Escape HTML tags to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Format code blocks / inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Format bold text
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Format italic text
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Format bullet and numbered lists
  const lines = html.split('\n');
  let inList = false;
  let inNumList = false;
  let formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Bullet list item
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        if (inNumList) {
          formattedLines.push('</ol>');
          inNumList = false;
        }
        formattedLines.push('<ul>');
        inList = true;
      }
      formattedLines.push(`<li>${line.substring(2)}</li>`);
    }
    // Numbered list item
    else if (/^\d+\.\s+/.test(line)) {
      if (!inNumList) {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        formattedLines.push('<ol>');
        inNumList = true;
      }
      const matchLength = line.match(/^\d+\.\s+/)[0].length;
      formattedLines.push(`<li>${line.substring(matchLength)}</li>`);
    }
    // Regular paragraph line
    else {
      if (inList) {
        formattedLines.push('</ul>');
        inList = false;
      }
      if (inNumList) {
        formattedLines.push('</ol>');
        inNumList = false;
      }
      if (line !== '') {
        formattedLines.push(`<p>${line}</p>`);
      }
    }
  }

  if (inList) formattedLines.push('</ul>');
  if (inNumList) formattedLines.push('</ol>');

  return formattedLines.join('');
}

export default function ChatWidget({
  isOpen,
  onClose,
  chatHistory,
  onSendMessage,
  isTyping,
}) {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom when messages or typing state change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = e.target.elements.chatInput;
    const val = input.value.trim();
    if (!val) return;
    onSendMessage(val);
    input.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="chat-widget-container-react">
          {/* Backdrop overlay to close when clicking outside */}
          <div className="chat-backdrop" onClick={onClose} />

          {/* Animated Drawer Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="chat-box open"
            style={{ pointerEvents: 'auto' }}
          >
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-glow"></div>
              <div className="chat-header-info">
                <div className="chat-avatar">
                  <Bot size={22} className="chat-bot-icon" />
                </div>
                <div className="chat-title-wrap">
                  <h4 className="chat-title">Nebula AI</h4>
                  <span className="chat-subtitle">● Online Assistant</span>
                </div>
              </div>
              <button
                className="chat-close-btn"
                onClick={onClose}
                aria-label="Close Chat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Container */}
            <div className="chat-messages">
              <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.5)',
                textAlign: 'center',
                padding: '8px 12px',
                marginBottom: '10px',
                background: 'rgba(255, 100, 100, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 100, 100, 0.2)'
              }}>
                ⚠️ To save tokens, conversation history will be deleted if you close the window or log out.
              </div>
              {chatHistory.map((msg, index) => {
                const timeStr = msg.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isAI = msg.role === 'ai';
                return (
                  <div
                    key={index}
                    className={`chat-msg chat-msg-${msg.role}`}
                  >
                    <div className="chat-msg-avatar-badge">
                      {isAI ? <Bot size={14} /> : <User size={14} />}
                    </div>
                    <div
                      className="chat-msg-content"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdown(msg.message),
                      }}
                    />
                    <div className="chat-msg-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span className="chat-msg-timestamp" style={{ marginBottom: 0 }}>{timeStr}</span>
                      {isAI && msg.metrics && (
                        <span className="chat-msg-metrics" style={{ fontSize: '9px', color: 'var(--cyan)', opacity: 0.8, letterSpacing: '0.3px', fontWeight: 600 }}>
                          ⚡ Tokens: {msg.metrics.total_tokens || msg.metrics.totalTokens || '?'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="chat-typing-bubble" id="chat-typing-indicator">
                  <span className="chat-typing-dot"></span>
                  <span className="chat-typing-dot"></span>
                  <span className="chat-typing-dot"></span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form className="chat-input-area" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                name="chatInput"
                type="text"
                className="chat-input"
                placeholder="Ask about anime, ratings, genres..."
                autoComplete="off"
              />
              <button
                type="submit"
                className="chat-send-btn"
                aria-label="Send Message"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
