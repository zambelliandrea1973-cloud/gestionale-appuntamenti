import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

export default function BetaPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [feedbackData, setFeedbackData] = useState({
    feedbackType: 'general',
    content: '',
    rating: 5
  });

  // Query per verificare un codice di invito
  const verifyCode = useMutation({
    mutationFn: async (data: { inviteCode: string, email: string }) => {
      const res = await apiRequest('GET', `/api/beta/verify/${data.inviteCode}`);
      const responseData = await res.json();
      // Salva l'email per creare l'account
      localStorage.setItem('betaRegistrationEmail', data.email);
      return { ...responseData, email: data.email };
    },
    onSuccess: (data) => {
      if (data.valid) {
        // Se l'utente è loggato, procedi all'utilizzo del codice
        if (user) {
          useCodeMutation.mutate(code);
        } else {
          // Mostra una notifica di successo e memorizza l'invito valido
          toast({
            title: 'Codice valido!',
            description: 'Il codice di invito è valido. Ora puoi accedere al programma beta.',
            variant: 'default',
          });
          
          // Memorizza l'invito valido
          localStorage.setItem('betaInviteCode', code);
          localStorage.setItem('betaInviteEmail', data.email);
          localStorage.setItem('betaInviteStatus', 'valid');
          
          // Reindirizza all'app principale dopo un breve ritardo
          setTimeout(() => {
            window.location.href = '/'; // Reindirizza alla home page
          }, 2000);
        }
      } else {
        toast({
          title: 'Codice non valido',
          description: data.message || 'Il codice di invito non è valido.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante la verifica del codice.',
        variant: 'destructive',
      });
    }
  });

  // Mutation per utilizzare un codice
  const useCodeMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiRequest('POST', `/api/beta/use/${inviteCode}`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Codice utilizzato!',
          description: 'Ora sei un beta tester ufficiale!',
          variant: 'default',
        });
        // Reindirizza alla pagina degli abbonamenti
        setLocation('/subscribe');
      } else {
        toast({
          title: 'Errore',
          description: data.message || 'Si è verificato un errore durante l\'utilizzo del codice.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'utilizzo del codice.',
        variant: 'destructive',
      });
    }
  });

  // Mutation per inviare feedback
  const sendFeedbackMutation = useMutation({
    mutationFn: async (data: typeof feedbackData) => {
      const res = await apiRequest('POST', '/api/beta/feedback', data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Feedback inviato!',
          description: 'Grazie per il tuo feedback!',
          variant: 'default',
        });
        // Reset del form
        setFeedbackData({
          feedbackType: 'general',
          content: '',
          rating: 5
        });
      } else {
        toast({
          title: 'Errore',
          description: data.message || 'Si è verificato un errore durante l\'invio del feedback.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'invio del feedback.',
        variant: 'destructive',
      });
    }
  });

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      toast({
        title: 'Codice mancante',
        description: 'Inserisci un codice di invito valido.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!email || !validateEmail(email)) {
      toast({
        title: 'Email non valida',
        description: 'Inserisci un indirizzo email valido.',
        variant: 'destructive',
      });
      return;
    }
    
    verifyCode.mutate({ inviteCode: code, email });
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackData.content) {
      toast({
        title: 'Feedback mancante',
        description: 'Inserisci un feedback valido.',
        variant: 'destructive',
      });
      return;
    }
    sendFeedbackMutation.mutate(feedbackData);
  };

  return (
    <div className="container py-10 mx-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-center mb-10">Programma Beta</h1>
        
        <div className="grid gap-8 md:grid-cols-2">
          {/* Card per il codice di invito */}
          <Card>
            <CardHeader>
              <CardTitle>Accesso Beta Tester</CardTitle>
              <CardDescription>
                Inserisci il tuo codice di invito e l'email associata per partecipare al programma beta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Codice di Invito</Label>
                  <Input
                    id="inviteCode"
                    placeholder="Inserisci il codice di invito"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="Inserisci la tua email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Deve corrispondere all'email associata al tuo invito beta
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={verifyCode.isPending || !code || !email}
                >
                  {verifyCode.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifica in corso...
                    </>
                  ) : (
                    'Verifica Codice'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Card per il feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Invia Feedback</CardTitle>
              <CardDescription>
                Aiutaci a migliorare con il tuo feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendFeedback} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feedbackType">Tipo di Feedback</Label>
                  <select
                    id="feedbackType"
                    className="w-full p-2 border rounded-md"
                    value={feedbackData.feedbackType}
                    onChange={(e) => setFeedbackData({...feedbackData, feedbackType: e.target.value})}
                  >
                    <option value="general">Generale</option>
                    <option value="bug">Bug</option>
                    <option value="feature">Nuova Funzionalità</option>
                    <option value="usability">Usabilità</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Il tuo Feedback</Label>
                  <textarea
                    id="content"
                    rows={4}
                    className="w-full p-2 border rounded-md"
                    placeholder="Descrivi il tuo feedback..."
                    value={feedbackData.content}
                    onChange={(e) => setFeedbackData({...feedbackData, content: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Valutazione (1-5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    value={feedbackData.rating}
                    onChange={(e) => setFeedbackData({...feedbackData, rating: parseInt(e.target.value)})}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={sendFeedbackMutation.isPending || !feedbackData.content}
                >
                  {sendFeedbackMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    'Invia Feedback'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Come Funziona il Programma Beta?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Il nostro programma beta ti dà accesso anticipato alle nuove funzionalità prima del rilascio ufficiale.
            In cambio, ci aiuti a migliorare l'applicazione con i tuoi preziosi feedback.
          </p>
          
          <div className="grid gap-6 md:grid-cols-3 mt-8">
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-bold mb-2">1. Ottieni un Codice</h3>
              <p>Inserisci il tuo codice di invito e l'email associata per accedere come beta tester</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-bold mb-2">2. Esplora l'App</h3>
              <p>Prova tutte le funzionalità della piattaforma in anteprima</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-bold mb-2">3. Condividi Feedback</h3>
              <p>Inviaci i tuoi commenti, segnalazioni e suggerimenti</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}