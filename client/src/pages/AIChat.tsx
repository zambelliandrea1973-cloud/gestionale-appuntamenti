import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, CheckCircle, XCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessagePreview {
  type: 'message' | 'notification';
  content: string;
  recipient?: string;
}

export default function AIChat() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<MessagePreview | null>(null);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await apiRequest('POST', '/api/ai-chat', {
        messages: [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ],
        includeContext: true
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Aggiungi risposta AI alla conversazione
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }]);

      // Se c'è una preview, mostrala
      if (data.preview) {
        setPreview(data.preview);
      }
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile comunicare con l'AI. Riprova.",
        variant: "destructive"
      });
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    
    // Aggiungi messaggio utente
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);
    
    setInput("");
    chatMutation.mutate(userMessage);
  };

  const handleApproveMessage = () => {
    toast({
      title: "Messaggio approvato",
      description: "Il messaggio è stato approvato e può essere inviato.",
    });
    setPreview(null);
  };

  const handleRejectMessage = () => {
    toast({
      title: "Messaggio rifiutato",
      description: "Puoi chiedere all'AI di generare un nuovo messaggio.",
    });
    setPreview(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="h-8 w-8 text-purple-500" />
          Assistente AI
        </h1>
        <p className="text-muted-foreground mt-2">
          Chiedimi di generare messaggi, cercare informazioni o darti suggerimenti per il tuo business
        </p>
      </div>

      {/* Area messaggi */}
      <Card className="mb-4 p-4 h-[500px] flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">Benvenuto nell'Assistente AI</p>
              <p className="text-sm">Prova a chiedere:</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• "Genera un messaggio di promemoria per domani"</li>
                <li>• "Suggeriscimi come gestire meglio gli appuntamenti"</li>
                <li>• "Cerca informazioni su tecniche di fisioterapia"</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {chatMutation.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Preview messaggio da approvare */}
      {preview && (
        <Card className="mb-4 p-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium text-sm mb-2">
                ⚠️ Messaggio generato - Richiede approvazione
              </p>
              {preview.recipient && (
                <p className="text-sm text-muted-foreground mb-2">
                  Destinatario: {preview.recipient}
                </p>
              )}
              <div className="bg-white dark:bg-gray-900 rounded p-3 mb-3">
                <p className="text-sm whitespace-pre-wrap">{preview.content}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleApproveMessage}
                  className="gap-2"
                  data-testid="button-approve-message"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approva e usa
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRejectMessage}
                  className="gap-2"
                  data-testid="button-reject-message"
                >
                  <XCircle className="h-4 w-4" />
                  Rifiuta
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Scrivi il tuo messaggio..."
          disabled={chatMutation.isPending}
          data-testid="input-chat-message"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || chatMutation.isPending}
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
