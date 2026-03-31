import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Loader,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { ai } from "../services/api";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  // Load chat history when widget opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadChatHistory();
    }
  }, [isOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await ai.getChatHistory();
      if (response.data && response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      // Don't show error toast, just load with empty state
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim()) {
      toast.error("Veuillez entrer un message");
      return;
    }

    const userMsg = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    try {
      // Add user message to UI immediately
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          user_message: userMsg,
          ai_response: "",
          message_type: "user",
          created_at: new Date().toISOString(),
        },
      ]);

      // Send to backend
      const response = await ai.sendChatMessage({
        user_message: userMsg,
        consultation_id: null,
      });

      if (response.data.success) {
        // Update with actual AI response
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...response.data,
              id: response.data.message_id,
            };
          }
          return updated;
        });
      } else {
        toast.error(response.data.error || "Erreur lors de la réponse");
        // Remove user message if failed
        setMessages((prev) => prev.slice(0, -1));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi du message");
      // Remove user message if failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir effacer l'historique?")) {
      return;
    }

    try {
      await ai.clearChatHistory();
      setMessages([]);
      toast.success("Historique effacé");
    } catch (error) {
      console.error("Error clearing chat history:", error);
      toast.error("Erreur lors de l'effacement de l'historique");
    }
  };

  return (
    <>
      {/* Chat Widget Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all duration-300 z-40 ${
          isOpen
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-[#0F6E56] hover:bg-[#0d5a47] text-white"
        }`}
        title="Chat Assistant"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0F6E56] to-emerald-600 text-white p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">DermaAssist Chat</h3>
              <p className="text-xs text-white/80">
                Assistant dermatologique IA
              </p>
            </div>
            <div className="flex gap-2">
              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-white/80 hover:text-white text-xs bg-white/20 px-2 py-1 rounded"
                  title="Effacer l'historique"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && !isLoadingHistory && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                <MessageSquare size={32} className="mb-2 opacity-50" />
                <p>Bienvenue! Posez une question sur:</p>
                <ul className="text-xs mt-3 space-y-1">
                  <li>• Symptômes et maladies de la peau</li>
                  <li>• Vos résultats de consultation</li>
                  <li>• Conseils généraux de santé</li>
                </ul>
              </div>
            )}

            {isLoadingHistory && (
              <div className="flex items-center justify-center h-full">
                <Loader size={24} className="animate-spin text-[#0F6E56]" />
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((msg, idx) => (
              <div key={msg.id || idx} className="space-y-2">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-[#0F6E56] text-white rounded-lg px-4 py-2 max-w-xs text-sm">
                    {msg.user_message}
                  </div>
                </div>

                {/* AI Response */}
                {msg.ai_response && (
                  <div className="flex justify-start">
                    <div
                      className="bg-gray-200 text-gray-900 rounded-lg px-4 py-2 max-w-xs text-sm"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {msg.ai_response}
                    </div>
                  </div>
                )}

                {msg.message_type === "user" && !msg.ai_response && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-900 rounded-lg px-4 py-2 flex items-center gap-2">
                      <Loader size={16} className="animate-spin" />
                      <span className="text-xs">Chargement...</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Posez une question..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F6E56] text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-[#0F6E56] text-white p-2 rounded-lg hover:bg-[#0d5a47] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
