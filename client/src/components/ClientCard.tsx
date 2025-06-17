import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Client } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Star, Info, Phone, Mail, Calendar, FileText, QrCode, ExternalLink, AlertTriangle, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ClientForm from "./ClientForm";
import AppointmentFormModal from "./AppointmentFormModal";
import QRCodeModal from "./QRCodeModal";
import ClientAccessCounter from "./ClientAccessCounter";
import ClientAccessesDialog from "./ClientAccessesDialog";

interface ClientCardProps {
  client: Client;
  onUpdate?: () => void;
  onDelete?: () => void;
  isOtherAccount?: boolean;
}

export default function ClientCard({ client, onUpdate, onDelete, isOtherAccount }: ClientCardProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [_, setLocation] = useLocation();
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [qrCodeModalTab, setQrCodeModalTab] = useState<"qrcode" | "link">("qrcode");
  const [clientQrCode, setClientQrCode] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [isAccessesDialogOpen, setIsAccessesDialogOpen] = useState(false);
  
  // Verifica se esiste già un token per questo cliente
  useEffect(() => {
    const checkExistingQrCode = async () => {
      try {
        console.log(`🔍 [FRONTEND] Richiesta QR per cliente: ${client.firstName} ${client.lastName} (ID: ${client.id})`);
        const response = await apiRequest("GET", `/api/clients/${client.id}/activation-token`);
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ [FRONTEND] QR ricevuto per cliente: ${data.clientName || 'Nome non disponibile'}`);
          if (data && data.qrCode) {
            setClientQrCode(data.qrCode);
          }
          if (data && data.token) {
            setClientToken(data.token);
          }
        } else if (response.status === 404) {
          // Cliente non esiste nel sistema - ignora silenziosamente
          return;
        }
      } catch (error) {
        // Ignora completamente gli errori 404 per evitare spam nei log
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('404') || errorMessage.includes('Cliente non trovato')) {
          return;
        }
        // Log solo per errori reali (non 404)
        console.error(t('errors.qrCodeFetchError'), error);
      }
    };
    
    checkExistingQrCode();
  }, [client.id]);
  
  // Delete mutation con prevenzione totale del caching
  // Mutazione per sbloccare la cancellazione di clienti importati eliminati alla fonte
  const unlockDeletionMutation = useMutation({
    mutationFn: async () => {
      console.log(`🔓 Sblocco cancellazione cliente importato ${client.id}`);
      return apiRequest("POST", `/api/unlock-client-deletion/${client.id}`);
    },
    onSuccess: async () => {
      console.log(`✅ Cancellazione sbloccata per cliente ${client.id}`);
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Cancellazione sbloccata",
        description: `${client.firstName} ${client.lastName} può ora essere eliminato`,
      });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      console.error(`❌ Errore sblocco cancellazione:`, error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile sbloccare la cancellazione",
        variant: "destructive",
      });
    },
  });

  // Mutazione per simulare eliminazione alla fonte (solo per test)
  const markDeletedAtSourceMutation = useMutation({
    mutationFn: async () => {
      console.log(`⚠️ Simulazione eliminazione alla fonte per cliente ${client.id}`);
      return apiRequest("POST", `/api/mark-client-deleted-at-source/${client.id}`);
    },
    onSuccess: async () => {
      console.log(`🚨 Cliente ${client.id} marcato come eliminato alla fonte`);
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Notifica eliminazione",
        description: `${client.firstName} ${client.lastName} eliminato dall'account originale`,
        variant: "destructive",
      });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      console.error(`❌ Errore simulazione eliminazione:`, error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile simulare eliminazione",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      console.log(`🚀 Eliminazione definitiva cliente ${client.id}`);
      return apiRequest("DELETE", `/api/clients/${client.id}`);
    },
    onMutate: async () => {
      // Prevenzione caching PRIMA della richiesta
      console.log(`🚫 Rimozione preventiva cliente ${client.id} dalla cache`);
      
      // Cancella TUTTI i tipi di cache correlati
      await queryClient.cancelQueries({ queryKey: ['/api/clients'] });
      await queryClient.cancelQueries({ queryKey: ['/api/clients', client.id] });
      
      // Rimuovi immediatamente dalla cache
      queryClient.removeQueries({ queryKey: ['/api/clients', client.id] });
      
      // Aggiorna la lista principale rimuovendo il cliente
      queryClient.setQueryData(['/api/clients'], (oldData: any) => {
        if (!oldData) return [];
        const newData = oldData.filter((c: any) => c.id !== client.id);
        console.log(`Cache aggiornata: ${oldData.length} -> ${newData.length} clienti`);
        return newData;
      });
    },
    onSuccess: async () => {
      console.log(`✅ Cliente ${client.id} eliminato definitivamente`);
      
      // Rimozione aggressiva da TUTTE le cache
      queryClient.removeQueries({ queryKey: ['/api/clients', client.id] });
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      await queryClient.refetchQueries({ queryKey: ['/api/clients'] });
      
      toast({
        title: t('notifications.clientDeleted'),
        description: `${client.firstName} ${client.lastName} eliminato`,
      });
      
      if (onUpdate) {
        onUpdate();
      }
    },
    onError: async (error: any) => {
      console.error(`❌ Errore eliminazione cliente ${client.id}:`, error);
      
      // Anche in caso di errore, rimuovi dalla cache se è 404
      if (error.message?.includes("Client not found") || error.message?.includes("404")) {
        console.log(`🗑️ Cliente ${client.id} non esistente sul server, pulizia cache`);
        
        // Rimozione completa dalla cache
        queryClient.removeQueries({ queryKey: ['/api/clients', client.id] });
        await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        
        toast({
          title: t('notifications.clientDeleted'),
          description: "Cliente rimosso dal sistema",
        });
        
        if (onUpdate) {
          onUpdate();
        }
      } else {
        // Ripristina lo stato precedente solo per errori reali
        await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        
        toast({
          title: t('common.error'),
          description: t('errors.genericError', { error: error.message }),
          variant: "destructive",
        });
      }
    }
  });

  // Funzione per aggiornare la lista clienti
  const refreshClientList = async () => {
    console.log(`🔄 Aggiornamento lista clienti dopo operazione su cliente ${client.id}`);
    
    // Invalida completamente la cache
    await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
    
    // Forza il refetch dei dati
    await queryClient.refetchQueries({ queryKey: ['/api/clients'] });
    
    // Chiama il callback se presente
    if (onUpdate) {
      await onUpdate();
    }
    
    console.log(`✅ Lista clienti aggiornata`);
  };
  
  const handleDelete = () => {
    console.log(`🗑️ ELIMINAZIONE CLIENTE ${client.id} - ${client.firstName} ${client.lastName}`);
    deleteMutation.mutate();
  };
  
  // Determina se il cliente è importato
  const isImported = client.originalOwnerId !== undefined;
  
  // Determina se il cliente è stato eliminato alla fonte
  const isDeletedAtSource = client.deletedAtSource === true;
  
  // Determina se la cancellazione è stata sbloccata
  const isDeletionUnlocked = client.deletionUnlocked === true;

  return (
    <Card className={`h-full ${isOtherAccount ? 'border-orange-200 bg-orange-50/30' : ''} ${isDeletedAtSource ? 'border-red-300 bg-red-50/50' : ''}`}>
      {/* Notifica cliente eliminato alla fonte */}
      {isDeletedAtSource && (
        <div className="bg-red-100 px-3 py-2 text-xs text-red-800 font-medium border-b border-red-200 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>⚠️ Cliente eliminato dall'account originale</span>
          </div>
          {!isDeletionUnlocked && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => unlockDeletionMutation.mutate()}
              disabled={unlockDeletionMutation.isPending}
              className="ml-2 h-6 px-2 text-xs bg-white hover:bg-red-50 border-red-300"
            >
              <Unlock className="h-3 w-3 mr-1" />
              Sblocca eliminazione
            </Button>
          )}
          {isDeletionUnlocked && (
            <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800">
              Eliminazione sbloccata
            </Badge>
          )}
        </div>
      )}
      
      {/* Notifica altro account (solo se non eliminato alla fonte) */}
      {isOtherAccount && !isDeletedAtSource && (
        <div className="bg-orange-100 px-3 py-1 text-xs text-orange-800 font-medium border-b border-orange-200">
          👥 Cliente di altro account (sola visualizzazione)
        </div>
      )}
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium flex items-center">
              {client.firstName} {client.lastName}
              {client.isFrequent && (
                <Star className="h-4 w-4 ml-1.5 text-pink-500" />
              )}
            </h3>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              {client.phone}
            </div>
            
            {client.email && (
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                {client.email}
              </div>
            )}
            
            {client.uniqueCode && typeof client.uniqueCode === 'string' && (
              <div className="flex items-center text-xs text-blue-600 mt-1 font-mono">
                <span className="bg-blue-50 px-2 py-1 rounded border">
                  {client.uniqueCode}
                </span>
              </div>
            )}
            
            {/* VERIFICA TOKEN QR - Mostra il token associato */}
            {clientToken && (
              <div className="flex items-center text-xs text-orange-600 mt-2 font-mono">
                <span className="bg-orange-50 px-2 py-1 rounded border border-orange-200">
                  TOKEN: {clientToken.substring(0, 20)}...{clientToken.substring(-8)}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex">
            {!isOtherAccount ? (
              <>
                <Dialog open={isClientFormOpen} onOpenChange={setIsClientFormOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <ClientForm 
                    clientId={client.id}
                    onClose={() => {
                      setIsClientFormOpen(false);
                      if (onUpdate) onUpdate();
                    }}
                  />
                </Dialog>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('clients.details.deleteClient')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('clients.details.deleteClientConfirmation')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {t('common.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Solo visualizzazione
              </Badge>
            )}
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          {client.address && (
            <div className="text-sm">
              <span className="font-medium">{t('common.address')}:</span> {client.address}
            </div>
          )}
          
          {client.birthday && (
            <div className="text-sm">
              <span className="font-medium">{t('common.birthday')}:</span> {new Date(client.birthday).toLocaleDateString()}
            </div>
          )}
          
          <div className="flex items-center mt-2 gap-2">
            {client.hasConsent ? (
              <Badge variant="outline" className="flex items-center text-green-600 border-green-200 bg-green-50">
                <Info className="h-3 w-3 mr-1" />
                {t('clients.details.consents')} ✓
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center text-amber-600 border-amber-200 bg-amber-50">
                <Info className="h-3 w-3 mr-1" />
                {t('clients.filter.noConsent')}
              </Badge>
            )}
            <div 
              className="cursor-pointer" 
              onClick={() => setIsAccessesDialogOpen(true)}
            >
              <ClientAccessCounter clientId={client.id} />
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-6 pb-6 pt-4 border-t flex flex-col gap-3">
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full"
          onClick={() => setLocation(`/client-medical-details?id=${client.id}`)}
        >
          <FileText className="h-4 w-4 mr-2" />
          {t('clients.details.clientFile')}
        </Button>
          
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => setIsAppointmentFormOpen(true)}
        >
          <Calendar className="h-4 w-4 mr-2" />
          {t('clients.details.addAppointment')}
        </Button>
        
        {clientQrCode ? (
          <div className="w-full border border-border rounded-md p-2 bg-background flex flex-col items-center">
            <img src={clientQrCode} alt={t('clients.details.generateQRCode')} className="w-32 h-32" />
            <p className="text-xs text-muted-foreground mt-1">{t('clients.details.accessActivated')}</p>
            <div className="flex gap-2 mt-1 w-full">
              <Button 
                variant="link" 
                size="sm" 
                className="px-0 h-6 text-xs"
                onClick={() => setIsQRCodeModalOpen(true)}
              >
                {t('clients.details.showDetails')}
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setIsQRCodeModalOpen(true)}
          >
            <QrCode className="h-4 w-4 mr-2" />
            {t('clients.details.generateQRCode')}
          </Button>
        )}
        
        {isAppointmentFormOpen && (
          <AppointmentFormModal 
            clientId={client.id} 
            onClose={() => {
              setIsAppointmentFormOpen(false);
              // Forziamo un refresh globale quando si chiude la modale
              if (onUpdate) {
                setTimeout(() => {
                  onUpdate();
                }, 500);
              }
            }} 
          />
        )}
        
        {isQRCodeModalOpen && (
          <QRCodeModal
            clientId={client.id}
            clientName={`${client.firstName} ${client.lastName}`}
            open={isQRCodeModalOpen}
            onClose={() => setIsQRCodeModalOpen(false)}
            onQrCodeGenerated={(qrCode) => setClientQrCode(qrCode)}
            initialTab={qrCodeModalTab}
          />
        )}
        
        {isAccessesDialogOpen && (
          <ClientAccessesDialog
            clientId={client.id}
            clientName={`${client.firstName} ${client.lastName}`}
            open={isAccessesDialogOpen}
            onClose={() => setIsAccessesDialogOpen(false)}
          />
        )}
      </CardFooter>
    </Card>
  );
}
