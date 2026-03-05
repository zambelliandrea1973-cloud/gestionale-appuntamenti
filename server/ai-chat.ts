import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

const requestQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
  fn: () => Promise<any>;
}> = [];
let activeRequests = 0;
const MAX_CONCURRENT = 10;
const MIN_INTERVAL_MS = 4500;
let lastRequestTime = 0;

async function processQueue() {
  if (requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT) return;

  const now = Date.now();
  const waitTime = Math.max(0, lastRequestTime + MIN_INTERVAL_MS - now);

  if (waitTime > 0) {
    setTimeout(() => processQueue(), waitTime);
    return;
  }

  const item = requestQueue.shift();
  if (!item) return;

  activeRequests++;
  lastRequestTime = Date.now();

  try {
    const result = await item.fn();
    item.resolve(result);
  } catch (error) {
    item.reject(error);
  } finally {
    activeRequests--;
    if (requestQueue.length > 0) {
      setTimeout(() => processQueue(), MIN_INTERVAL_MS);
    }
  }
}

function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    requestQueue.push({ resolve, reject, fn });
    processQueue();
  });
}

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

const SYSTEM_PROMPT = `Sei un assistente AI per un sistema gestionale medico/sanitario. 
      
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
Per suggerimenti generali, fornisci consigli pratici e applicabili.`;

export async function processChatMessage(request: ChatRequest): Promise<AIResponse> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ [AI CHAT] GEMINI_API_KEY non configurata');
    return {
      message: 'Il servizio AI non è configurato. Contatta l\'amministratore.',
      intent: 'general'
    };
  }

  const queueSize = requestQueue.length;
  if (queueSize > 50) {
    return {
      message: 'Il servizio AI è molto richiesto in questo momento. Riprova tra qualche minuto.',
      intent: 'general'
    };
  }

  if (queueSize > 0) {
    console.log(`⏳ [AI CHAT] Richiesta in coda (posizione ${queueSize + 1})`);
  }

  return enqueueRequest(async () => {
    try {
      console.log('🤖 [AI CHAT] Processando messaggio con', request.messages.length, 'messaggi nella storia');

      const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.5-flash' });

      const chatHistory = request.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' as const : 'user' as const,
          parts: [{ text: m.content }]
        }));

      const lastUserMessage = chatHistory.pop();
      if (!lastUserMessage) {
        return { message: 'Nessun messaggio da processare.', intent: 'general' } as AIResponse;
      }

      const chat = model.startChat({
        history: chatHistory.length > 0 ? chatHistory : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      const prompt = chatHistory.length === 0
        ? `${SYSTEM_PROMPT}\n\n${lastUserMessage.parts[0].text}`
        : lastUserMessage.parts[0].text;

      const result = await chat.sendMessage(prompt);
      const aiMessage = result.response.text() || 'Mi dispiace, non sono riuscito a processare la richiesta.';

      console.log('✅ [AI CHAT] Risposta ricevuta da Gemini');

      const intent = detectIntent(request.messages[request.messages.length - 1].content, aiMessage);
      const preview = extractMessagePreview(aiMessage);

      return {
        message: aiMessage,
        intent,
        actionRequired: !!preview,
        preview
      } as AIResponse;

    } catch (error: any) {
      console.error('❌ [AI CHAT] Errore:', error.message);

      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RATE_LIMIT') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.log('⏳ [AI CHAT] Rate limit, riprovo tra 5 secondi...');
        try {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.5-flash' });
          const retryResult = await model.generateContent(
            SYSTEM_PROMPT + '\n\n' + request.messages[request.messages.length - 1].content
          );
          const retryMessage = retryResult.response.text();
          if (retryMessage) {
            console.log('✅ [AI CHAT] Retry riuscito');
            const intent = detectIntent(request.messages[request.messages.length - 1].content, retryMessage);
            return { message: retryMessage, intent } as AIResponse;
          }
        } catch (retryError: any) {
          console.error('❌ [AI CHAT] Anche il retry ha fallito:', retryError.message);
        }
        return {
          message: 'Il servizio è momentaneamente sovraccarico. Riprova tra 30 secondi.',
          intent: 'general'
        } as AIResponse;
      }

      return {
        message: 'Mi dispiace, si è verificato un errore. Riprova tra poco.',
        intent: 'general'
      } as AIResponse;
    }
  });
}

function detectIntent(userMessage: string, aiResponse: string): AIResponse['intent'] {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('genera') || lowerMessage.includes('scrivi') ||
      lowerMessage.includes('messaggio') || lowerMessage.includes('reminder') ||
      lowerMessage.includes('promemoria') || lowerMessage.includes('notifica')) {
    return 'generate_message';
  }

  if (lowerMessage.includes('cerca') || lowerMessage.includes('trova') ||
      lowerMessage.includes('informazioni su') || lowerMessage.includes('cos\'è')) {
    return 'search_info';
  }

  if (lowerMessage.includes('suggerisci') || lowerMessage.includes('consiglia') ||
      lowerMessage.includes('come posso') || lowerMessage.includes('migliorare')) {
    return 'suggestion';
  }

  return 'general';
}

function extractMessagePreview(aiResponse: string): AIResponse['preview'] | undefined {
  try {
    const jsonMatch = aiResponse.match(/\{[^}]*"type":\s*"message_preview"[^}]*\}/);
    if (jsonMatch) {
      const preview = JSON.parse(jsonMatch[0]);
      return {
        type: 'message',
        content: preview.content,
        recipient: preview.recipient
      };
    }

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

export async function generateMarketingCampaign(userPrompt: string): Promise<{ title: string; message: string }> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ [AI CAMPAIGN] GEMINI_API_KEY non configurata');
    return {
      title: 'Servizio AI non configurato',
      message: 'Contatta l\'amministratore per configurare il servizio AI.'
    };
  }

  try {
    console.log('📧 [AI CAMPAIGN] Generando campagna marketing per:', userPrompt.substring(0, 100));
    console.log('📧 [AI CAMPAIGN] API Key presente:', !!process.env.GEMINI_API_KEY);

    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Sei un esperto di marketing per studi medici e professionisti della salute.

Il tuo compito è creare campagne marketing professionali, convincenti e personalizzate.

FORMATO RISPOSTA:
Rispondi SEMPRE con un JSON in questo formato esatto:
{
  "title": "Titolo breve della campagna (max 60 caratteri)",
  "message": "Messaggio completo della campagna (max 500 caratteri)"
}

LINEE GUIDA PER IL MESSAGGIO:
- Tono professionale ma amichevole
- Include call-to-action chiara (es: "Prenota ora", "Chiama oggi", "Offerta limitata")
- Personalizza in base al contesto medico/sanitario
- Evidenzia benefici per il paziente
- Aggiungi senso di urgenza quando appropriato
- Usa emoji con moderazione (max 2-3)
- Firma professionale se appropriato

Ora genera la campagna basata sulla richiesta dell'utente:
${userPrompt}`;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text() || '';
    console.log('✅ [AI CAMPAIGN] Risposta ricevuta da Gemini:', aiResponse.substring(0, 200));

    const jsonMatch = aiResponse.match(/\{[\s\S]*"title"[\s\S]*"message"[\s\S]*\}/);
    if (jsonMatch) {
      const campaign = JSON.parse(jsonMatch[0]);
      return {
        title: campaign.title.substring(0, 60),
        message: campaign.message.substring(0, 500)
      };
    }

    return {
      title: 'Nuova Comunicazione ai Clienti',
      message: aiResponse.substring(0, 500) || 'Messaggio generato con AI'
    };

  } catch (error: any) {
    console.error('❌ [AI CAMPAIGN] Errore completo:', error);
    console.error('❌ [AI CAMPAIGN] Errore messaggio:', error?.message);
    console.error('❌ [AI CAMPAIGN] Errore status:', error?.status);

    return {
      title: 'Nuova Campagna Marketing',
      message: `Messaggio personalizzato: ${userPrompt.substring(0, 300)}`
    };
  }
}

export async function searchOnlineInfo(query: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return 'Il servizio AI non è configurato.';
  }

  return enqueueRequest(async () => {
    try {
      const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent(
        `Cerca informazioni su: ${query}. Fornisci una risposta concisa e utile basata sulle tue conoscenze.`
      );

      return result.response.text() || 'Nessuna informazione trovata.';
    } catch (error) {
      console.error('❌ [AI SEARCH] Errore ricerca:', error);
      return 'Mi dispiace, non sono riuscito a trovare informazioni al momento.';
    }
  });
}
