import React, { useState } from 'react';
import Header from './components/Header';
import ExampleQuestions from './components/ExampleQuestions';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import { sendChatMessage, resetChatSession } from './api';

/**
 * Main Application Component
 * Clean, minimal ChatGPT-style interface with Example Prompts and Context-Aware Support.
 */
export default function App() {
  const [role, setRole] = useState('customer'); // 'customer' | 'support_agent'
  const [sessionId, setSessionId] = useState(() => 'sess-' + Math.random().toString(36).substring(2, 9));
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // BUG/FIX 8: Role switch must automatically start a NEW session and clear old messages
  const handleRoleChange = async (newRole) => {
    if (newRole === role) return;

    // Reset server-side session
    if (sessionId) {
      await resetChatSession(sessionId);
    }

    // Switch role, generate fresh session ID, and clear conversation history
    setRole(newRole);
    setMessages([]);
    setInputText('');
    setSessionId('sess-' + Math.random().toString(36).substring(2, 9));
  };

  // Handle sending a new message
  const handleSendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: trimmed,
    };

    // Add user message to UI immediately and clear input
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        message: trimmed,
        role: role,
        sessionId: sessionId,
      });

      // Update sessionId if server provided/confirmed
      if (response.session_id) {
        setSessionId(response.session_id);
      }

      // Add assistant response to UI with safe debug metadata
      const assistantMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'assistant',
        text: response.answer || 'No response generated.',
        debug_view: response.debug_view,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = {
        id: 'err-' + Date.now(),
        sender: 'assistant',
        text: `Sorry, an error occurred: ${err.message}. Please check backend logs.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle New Chat (Session reset)
  const handleNewChat = async () => {
    if (sessionId) {
      await resetChatSession(sessionId);
    }
    setMessages([]);
    setInputText('');
    setSessionId('sess-' + Math.random().toString(36).substring(2, 9));
  };

  // Handle selecting an example question
  const handleSelectExample = (questionText) => {
    setInputText(questionText);
  };

  return (
    <div className="app-container">
      <Header
        role={role}
        onRoleChange={handleRoleChange}
        onNewChat={handleNewChat}
        isLoading={isLoading}
      />

      <div className="workspace-layout">
        {/* Left-side Example Questions Section */}
        <ExampleQuestions
          role={role}
          onSelectQuestion={handleSelectExample}
        />

        {/* Center Chat Area */}
        <main className="chat-container">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            currentRole={role}
          />

          <div className="input-container">
            <ChatInput
              value={inputText}
              onChange={setInputText}
              onSendMessage={handleSendMessage}
              disabled={isLoading}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
