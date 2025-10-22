import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, QrCode, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn } from "@/lib/queryClient";

interface AssignmentCodeData {
  assignmentCode: string;
  username: string;
  email: string;
}

export default function AssignmentCodeDisplay() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Recupera il codice di assegnazione dell'utente corrente
  const { data: codeData, isLoading, refetch } = useQuery<AssignmentCodeData>({
    queryKey: ['/api/assignment-code'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const copyToClipboard = async () => {
    if (!codeData?.assignmentCode) return;
    
    try {
      await navigator.clipboard.writeText(codeData.assignmentCode);
      setCopied(true);
      toast({
        title: "Codice copiato",
        description: "Il codice di assegnazione è stato copiato negli appunti.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile copiare il codice negli appunti.",
      });
    }
  };

  const shareCode = async () => {
    if (!codeData?.assignmentCode) return;
    
    const shareText = `Usa il codice ${codeData.assignmentCode} per essere assegnato al mio account quando ti registri come cliente.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Codice di Assegnazione Cliente',
          text: shareText,
        });
      } catch (error) {
        // Se la condivisione nativa fallisce, copia negli appunti
        copyToClipboard();
      }
    } else {
      // Fallback: copia negli appunti
      copyToClipboard();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <QrCode className="mr-2 h-5 w-5" />
            Codice di Assegnazione Clienti
          </CardTitle>
          <CardDescription>
            Caricamento codice in corso...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-16">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!codeData?.assignmentCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <QrCode className="mr-2 h-5 w-5" />
            Codice di Assegnazione Clienti
          </CardTitle>
          <CardDescription>
            Nessun codice di assegnazione disponibile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Il tuo account non ha ancora un codice di assegnazione.
          </p>
          <Button onClick={() => refetch()} className="w-full mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Riprova
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <QrCode className="mr-2 h-5 w-5" />
          Codice di Assegnazione Clienti
        </CardTitle>
        <CardDescription>
          Condividi questo codice con i tuoi clienti. Quando si registrano nell'app cliente e inseriscono questo codice, verranno automaticamente assegnati al tuo account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Il tuo codice di assegnazione:
            </label>
            <div className="flex gap-2 mt-2">
              <Input
                value={codeData.assignmentCode}
                readOnly
                className="font-mono text-lg text-center bg-primary/10 border-primary/20"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title="Copia negli appunti"
              >
                <Copy className={`h-4 w-4 ${copied ? 'text-green-600' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={shareCode}
                title="Condividi"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Come usare questo codice:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Condividi il codice <span className="font-mono bg-blue-100 px-1 rounded">{codeData.assignmentCode}</span> con i tuoi clienti</li>
              <li>Quando si registrano nell'app cliente, dovranno inserire questo codice</li>
              <li>Il cliente verrà automaticamente assegnato al tuo account</li>
              <li>Potrai gestire i suoi appuntamenti e dati dalla tua dashboard</li>
            </ol>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Account: {codeData.email}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}