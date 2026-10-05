import React, { useState, useRef, useEffect } from "react";
import { Send, Circle } from "lucide-react";

const API_URL = "http://localhost:8000/chat"; 

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatbotUI() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: "Hello Ankit",
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), sender: "user", text: trimmed, time: new Date() };
    // Server ko poori history ke saath bhejni hai (bina 'id'/'time' ke, sirf role+content)
    const history = [...messages, userMsg].map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Bot ka khaali message banate hain, jise stream aate hi bharte jayenge
    const botMsgId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, sender: "bot", text: "", time: new Date() },
    ]);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // adhoora chunk agli baar ke liye rakh lo

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;

          try {
            const { content } = JSON.parse(payload);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === botMsgId ? { ...m, text: m.text + content } : m
              )
            );
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, text: "⚠️ Server se connect nahi ho paya. Kya backend chal raha hai?" }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Georgia', 'Noto Serif', serif",
        minHeight: "100vh",
        width: "100%",
        background: "#0F2624",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#163531",
          border: "1px solid #2A5651",
          borderRadius: "18px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "640px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #2A5651",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "#122E2B",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#E8A33D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Georgia, serif",
              fontWeight: "bold",
              fontSize: "18px",
              color: "#122E2B",
              flexShrink: 0,
            }}
          >
            M
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#F2EFE6", fontSize: "16px", fontWeight: "bold" }}>
              Mitra
            </div>
            <div
              style={{
                color: "#8FB3AD",
                fontSize: "12px",
                fontFamily: "'Courier New', monospace",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Circle size={7} fill="#6FCF97" color="#6FCF97" />
              online
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background:
              "repeating-linear-gradient(0deg, #163531, #163531 27px, #1B3E39 28px)",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  padding: "10px 14px",
                  fontSize: "14.5px",
                  lineHeight: "1.5",
                  color: msg.sender === "user" ? "#122E2B" : "#F2EFE6",
                  background: msg.sender === "user" ? "#E8A33D" : "#274F4A",
                  borderRadius:
                    msg.sender === "user"
                      ? "14px 14px 3px 14px"
                      : "14px 14px 14px 3px",
                  wordBreak: "break-word",
                  minHeight: "1.4em",
                }}
              >
                {msg.text}
              </div>
              <div
                style={{
                  fontSize: "10.5px",
                  color: "#5E8580",
                  marginTop: "4px",
                  fontFamily: "'Courier New', monospace",
                  padding: "0 4px",
                }}
              >
                {formatTime(msg.time)}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div
                style={{
                  padding: "12px 16px",
                  background: "#274F4A",
                  borderRadius: "14px 14px 14px 3px",
                  display: "flex",
                  gap: "4px",
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#8FB3AD",
                      display: "inline-block",
                      animation: `bounce 1.2s infinite ${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            padding: "14px",
            borderTop: "1px solid #2A5651",
            background: "#122E2B",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Apna message likhiye..."
            style={{
              flex: 1,
              padding: "11px 14px",
              borderRadius: "10px",
              border: "1px solid #2A5651",
              background: "#0F2624",
              color: "#F2EFE6",
              fontSize: "14px",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={sendMessage}
            aria-label="Message bhejein"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              border: "none",
              background: "#E8A33D",
              color: "#122E2B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #2A5651; border-radius: 3px; }
      `}</style>
    </div>
  );
}
