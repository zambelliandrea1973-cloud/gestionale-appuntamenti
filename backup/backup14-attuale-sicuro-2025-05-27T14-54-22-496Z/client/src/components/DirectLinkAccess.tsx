import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon, ExternalLink, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DirectLinkAccessProps {
  token?: string;
  clientId?: number;
}

export function DirectLinkAccess({ token, clientId }: DirectLinkAccessProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  // Costruisci il link diretto con il token se disponibile
  const getDirectLink = () => {
    const baseUrl = window.location.origin;
    if (token) {
      return `${baseUrl}/client-area?token=${token}`;
    }
    return `${baseUrl}/client-area`;
  };
  
  const directLink = getDirectLink();
  
  // Funzione per copiare il link negli appunti
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(directLink);
      setCopied(true);
      
      toast({
        title: "Link copiato",
        description: "Il link diretto è stato copiato negli appunti",
        variant: "default",
      });
      
      // Resetta l'icona di copia dopo 2 secondi
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Errore nella copia del link:", error);
      toast({
        title: "Errore",
        description: "Impossibile copiare il link",
        variant: "destructive",
      });
    }
  };
  
  // Funzione per aprire il link diretto in una nuova finestra
  const openDirectLink = () => {
    window.open(directLink, '_blank');
  };

  // Toggle per mostrare/nascondere i dettagli del link
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <Card className="mb-6 border-green-200 bg-green-50/50 overflow-hidden">
      {/* Header clickabile (tirolo) per espandere/minimizzare */}
      <CardHeader 
        className="pb-2 cursor-pointer hover:bg-green-100/50 transition-colors"
        onClick={toggleExpand}
      >
        <div className="flex justify-between items-center w-full">
          <CardTitle className="text-lg flex items-center">
            <LinkIcon className="mr-2 h-5 w-5" />
            Link Diretto all'Area Cliente
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        {!expanded && (
          <CardDescription className="text-xs">
            Clicca per gestire il link di accesso rapido
          </CardDescription>
        )}
      </CardHeader>
      
      {/* Corpo espandibile */}
      {expanded && (
        <>
          <CardContent>
            <CardDescription className="mb-3">
              Utilizza questo link per accedere direttamente alla tua area personale
            </CardDescription>
            <div className="flex items-center space-x-2 mb-2">
              <Input 
                value={directLink} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title="Copia link"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {token 
                ? "Questo link contiene un token di accesso che ti permette di entrare direttamente nell'area cliente senza effettuare il login. Non condividerlo con persone non autorizzate." 
                : "Usa questo link per accedere rapidamente all'area cliente."}
            </p>
          </CardContent>
          <CardFooter>
            <div className="flex w-full gap-2">
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={openDirectLink}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Apri Area Cliente
              </Button>
              <Button
                variant="outline"
                className="w-auto"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copia link
              </Button>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}