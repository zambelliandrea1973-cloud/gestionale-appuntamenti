import React from 'react';
import Layout from '@/components/Layout';
import NotificationTester from '@/components/NotificationTester';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageSquare, LucideSmartphone } from 'lucide-react';

/**
 * Pagina per testare l'invio di email e messaggi WhatsApp
 */
const TestNotificationsPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Test Notifiche</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <NotificationTester />
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Istruzioni</CardTitle>
                <CardDescription>
                  Come utilizzare i servizi di notifica diretti
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-500" />
                    Notifiche Email
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Le email vengono inviate utilizzando le impostazioni SMTP configurate nella pagina "Impostazioni Notifiche".
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
                    <li>Assicurati di aver configurato correttamente il server SMTP, porta, username e password</li>
                    <li>Per Gmail potrebbe essere necessario configurare una "Password per app" <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">qui</a></li>
                    <li>Verifica che l'indirizzo email del destinatario sia corretto</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    Messaggi WhatsApp
                  </h3>
                  <p className="text-gray-700 text-sm">
                    I messaggi WhatsApp vengono inviati tramite link diretto che apre WhatsApp sul tuo dispositivo.
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
                    <li>Assicurati che il numero di telefono sia in formato internazionale (es. +391234567890)</li>
                    <li>Il link aprirà WhatsApp con il messaggio precompilato, pronto per essere inviato</li>
                    <li>I messaggi verranno inviati dal <strong>tuo numero WhatsApp</strong>, non da un numero di servizio</li>
                    <li>Non sono necessari account di servizi esterni o costi aggiuntivi</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <LucideSmartphone className="h-5 w-5 text-purple-500" />
                    Promemoria Automatici
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Il sistema può inviare automaticamente promemoria per gli appuntamenti.
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
                    <li>I promemoria email vengono inviati automaticamente se configurati</li>
                    <li>Per WhatsApp, il sistema genera link che puoi usare per inviare messaggi</li>
                    <li>I promemoria vengono inviati 24 ore prima dell'appuntamento (o secondo le impostazioni)</li>
                    <li>Puoi personalizzare i modelli di promemoria nella sezione apposita</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TestNotificationsPage;