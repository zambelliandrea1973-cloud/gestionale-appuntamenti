import React from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import EmailAndCalendarSettings from '@/components/EmailAndCalendarSettings';

export default function EmailSettings() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <header className="mb-6">
        <div className="flex items-center mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 h-8 w-8"
            onClick={() => setLocation("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Impostazioni Email</h1>
        </div>
        <p className="text-muted-foreground">
          Configura l'invio di email ai clienti con template personalizzato
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            <span>Configurazione Email</span>
          </CardTitle>
          <CardDescription>
            Configura l'invio delle email di notifica per i promemoria degli appuntamenti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailAndCalendarSettings />
        </CardContent>
      </Card>
    </div>
  );
}