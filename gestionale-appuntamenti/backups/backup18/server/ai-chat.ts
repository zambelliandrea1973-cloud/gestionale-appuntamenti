import { GoogleGenAI } from '@google/genai';

// Forza l'uso di GEMINI_API_KEY (non GOOGLE_API_KEY che è per altri servizi)
const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
});

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    clientData?: any;
    onboardingPreferences?: any;
  };
}

interface AIResponse {
  message: string;
  intent?: 'generate_message' | 'search_info' | 'suggestion' | 'general';
  actionRequired?: boolean;
  preview?: {
    type: 'message' | 'notification';
    content: string;
    recipient?: string;
  };
}

/**
 * Processa una richiesta chat con l'AI
 * Riconosce intenti e fornisce risposte appropriate
 */
export async function processChatMessage(request: ChatRequest): Promise<AIResponse> {
  try {
    console.log('🤖 [AI CHAT] Processando messaggio con', request.messages.length, 'messaggi nella storia');
    
    // Sistema prompt che definisce il comportamento dell'AI
    const systemPrompt: ChatMessage = {
      role: 'system',
      content: `Sei un assistente AI per un sistema gestionale medico/sanitario. 
      
Il tuo compito è aiutare l'utente con:
1. Generazione di messaggi personalizzati per clienti (reminder, promemoria, comunicazioni)
2. Ricerca di informazioni online quando richiesto
3. Suggerimenti per migliorare la gestione del business
4. Risposte a domande generali

REGOLE IMPORTANTI:
- Quando generi un messaggio, usa il formato JSON: {"type": "message_preview", "content": "testo del messaggio"}
- NON modificare MAI orari di lavoro o configurazioni automaticamente
- Chiedi sempre conferma prima di suggerire azioni che modificano dati
- Sii conciso e professionale
- Parla in italiano a meno che l'utente non richieda altra lingua

Se riconosci una richiesta di generazione messaggio, rispondi SEMPRE con JSON nel formato:
{"type": "message_preview", "content": "Il tuo messaggio qui", "recipient": "chi lo riceve"}

Per ricerche online, indica chiaramente che stai cercando informazioni.
Per suggerimenti generali, fornisci consigli pratici e applicabili.`
    };

    // Prepara i messaggi per OpenAI
    const messages: ChatMessage[] = [
      systemPrompt,
      ...request.messages
    ];

    // Chiama Google Gemini
    const prompt = messages.map(m => {
      if (m.role === 'system') return m.content;
      return `${m.role === 'user' ? 'Utente' : 'Assistente'}: ${m.content}`;
    }).join('\n\n');

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    });

    const aiMessage = response.text || 'Mi dispiace, non sono riuscito a processare la richiesta.';
    
    console.log('✅ [AI CHAT] Risposta ricevuta da Gemini');

    // Analizza l'intento dalla risposta
    const intent = detectIntent(request.messages[request.messages.length - 1].content, aiMessage);
    
    // Controlla se è una preview di messaggio
    const preview = extractMessagePreview(aiMessage);

    return {
      message: preview ? aiMessage : aiMessage,
      intent,
      actionRequired: !!preview,
      preview
    };

  } catch (error: any) {
    console.error('❌ [AI CHAT] Errore:', error.message);
    
    // Fallback intelligente in caso di errore
    if (error.code === 'insufficient_quota') {
      return {
        message: 'Il servizio AI ha raggiunto il limite di utilizzo. Riprova più tardi o contatta l\'amministratore.',
        intent: 'general'
      };
    }

    return {
      message: 'Mi dispiace, si è verificato un errore. Riprova tra poco.',
      intent: 'general'
    };
  }
}

/**
 * Rileva l'intento dell'utente dal messaggio
 */
function detectIntent(userMessage: string, aiResponse: string): AIResponse['intent'] {
  const lowerMessage = userMessage.toLowerCase();
  
  // Parole chiave per generazione messaggi
  if (lowerMessage.includes('genera') || lowerMessage.includes('scrivi') || 
      lowerMessage.includes('messaggio') || lowerMessage.includes('reminder') ||
      lowerMessage.includes('promemoria') || lowerMessage.includes('notifica')) {
    return 'generate_message';
  }
  
  // Parole chiave per ricerca
  if (lowerMessage.includes('cerca') || lowerMessage.includes('trova') || 
      lowerMessage.includes('informazioni su') || lowerMessage.includes('cos\'è')) {
    return 'search_info';
  }
  
  // Parole chiave per suggerimenti
  if (lowerMessage.includes('suggerisci') || lowerMessage.includes('consiglia') || 
      lowerMessage.includes('come posso') || lowerMessage.includes('migliorare')) {
    return 'suggestion';
  }
  
  return 'general';
}

/**
 * Estrae preview di messaggio dalla risposta AI se presente
 */
function extractMessagePreview(aiResponse: string): AIResponse['preview'] | undefined {
  try {
    // Cerca pattern JSON nella risposta
    const jsonMatch = aiResponse.match(/\{[^}]*"type":\s*"message_preview"[^}]*\}/);
    if (jsonMatch) {
      const preview = JSON.parse(jsonMatch[0]);
      return {
        type: 'message',
        content: preview.content,
        recipient: preview.recipient
      };
    }
    
    // Pattern alternativo: cerca blocchi di testo tra virgolette o dopo "messaggio:"
    const messageMatch = aiResponse.match(/(?:messaggio:|testo:)\s*"([^"]+)"/i);
    if (messageMatch) {
      return {
        type: 'message',
        content: messageMatch[1]
      };
    }
    
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Ricerca informazioni online usando OpenAI
 * (Funzionalità futura con web browsing)
 */
export async function searchOnlineInfo(query: string): Promise<string> {
  // Delega a Gemini per la ricerca di informazioni
  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: `Cerca informazioni su: ${query}. Fornisci una risposta concisa e utile basata sulle tue conoscenze.`,
      config: {
        temperature: 0.5,
        maxOutputTokens: 800
      }
    });

    return response.text || 'Nessuna informazione trovata.';
  } catch (error) {
    console.error('❌ [AI SEARCH] Errore ricerca:', error);
    return 'Mi dispiace, non sono riuscito a trovare informazioni al momento.';
  }
}
