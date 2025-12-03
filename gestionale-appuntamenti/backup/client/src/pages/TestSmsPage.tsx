import React from 'react';
import Layout from '@/components/Layout';
import TwilioTester from '@/components/TwilioTester';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Pagina per testare l'invio di SMS e messaggi WhatsApp
 */
const TestSmsPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Test Notifiche</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <TwilioTester />
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Istruzioni</CardTitle>
                <CardDescription>
                  Come utilizzare i servizi di notifica Twilio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Account di prova (Trial) Twilio</h3>
                  <p className="text-gray-700 text-sm">
                    Se stai utilizzando un account di prova Twilio, puoi inviare messaggi solo a numeri di telefono
                    che sono stati verificati nel tuo account Twilio.
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
                    <li>Verifica i numeri di telefono su <a href="https://www.twilio.com/console/phone-numbers/verified" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">twilio.com/console/phone-numbers/verified</a></li>
                    <li>In produzione, acquista un account Twilio completo per inviare messaggi a qualsiasi numero</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Risoluzione dei problemi</h3>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    <li>Assicurati che il numero di telefono sia in formato internazionale (es. +391234567890)</li>
                    <li>Verifica che il numero di telefono Twilio sia abilitato per SMS/WhatsApp</li>
                    <li>Per WhatsApp, il destinatario deve aver avviato una conversazione con il tuo numero Twilio o utilizzare un template approvato</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Configurazione dell'app</h3>
                  <p className="text-gray-700 text-sm">
                    L'app è configurata con le seguenti variabili d'ambiente Twilio:
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm font-mono bg-gray-50 p-2 rounded-md">
                    <li>TWILIO_ACCOUNT_SID</li>
                    <li>TWILIO_AUTH_TOKEN</li>
                    <li>TWILIO_PHONE_NUMBER</li>
                  </ul>
                  <p className="text-gray-700 text-sm mt-2">
                    Puoi modificare queste variabili nelle impostazioni dell'app o nel file .env.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TestSmsPage;