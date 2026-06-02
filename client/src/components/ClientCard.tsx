// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Client } from "../../../shared/schema";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Star, Info, Phone, Mail, Calendar, FileText, QrCode, ExternalLink, AlertTriangle, Unlock, Eye, UserCog, Copy, Share2, MessageCircle, Send } from "lucide-react";
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
import ClientAccessesDialog from "./ClientAccessesDialog";

interface ClientCardProps {
  client: Client;
  onUpdate?: () => void;
  onDelete?: () => void;
  isOtherAccount?: boolean;
}

export default function ClientCard({ client, onUpdate, onDelete, isOtherAccount: isOtherAccountProp }: ClientCardProps) {
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
  
  const { data: contactInfo } = useQuery<any>({
    queryKey: ['/api/contact-info'],
  });

  // Calcola isOtherAccount direttamente se non passato dal parent
  // Usa useQuery per ottenere l'utente corrente se necessario
  const {data: currentUser} = useQuery<any>({
    queryKey: ['/api/user'],
    enabled: isOtherAccountProp === undefined
  });
  
  // Calcolo fallback se il prop non è passato
  const clientOwnerId = client.ownerId || (client as any)?.originalOwnerId;
  const isOtherAccount = isOtherAccountProp !== undefined 
    ? isOtherAccountProp 
    : (currentUser?.type === 'admin' && clientOwnerId && clientOwnerId !== currentUser.id);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const qrLoadedRef = useRef(false);

  useEffect(() => {
    if (qrLoadedRef.current || clientQrCode) return;
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !qrLoadedRef.current) {
          qrLoadedRef.current = true;
          observer.disconnect();
          (async () => {
            try {
              const response = await apiRequest("GET", `/api/clients/${client.id}/activation-token`);
              if (response.ok) {
                const data = await response.json();
                if (data?.qrCode) setClientQrCode(data.qrCode);
                if (data?.token) setClientToken(data.token);
              }
            } catch (_) {}
          })();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [client.id, clientQrCode]);
  
  // Delete mutation con prevenzione totale del caching
  // Mutazione per sbloccare la cancellazione di clienti importati eliminati alla fonte
  const unlockDeletionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/unlock-client-deletion/${client.id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: t('i18nFinale.clientCard.deletionUnlocked'),
        description: t('i18nFinale.clientCard.canNowBeDeleted', '{{name}} can now be deleted', { name: `${client.firstName} ${client.lastName}` }),
      });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('i18nFinale.clientCard.cannotUnlock'),
        variant: "destructive",
      });
    },
  });

  // Mutazione per simulare eliminazione alla fonte (solo per test)
  const markDeletedAtSourceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/mark-client-deleted-at-source/${client.id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: t('i18nFinale.clientCardExtra.deletionNotificationTitle'),
        description: t('i18nFinale.clientCardExtra.deletedFromSourceToast', { firstName: client.firstName, lastName: client.lastName }),
        variant: "destructive",
      });
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('i18nFinale.clientCard.cannotMarkDeleted'),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/clients/${client.id}`);
    },
    onMutate: async () => {
      // Cancella TUTTI i tipi di cache correlati
      await queryClient.cancelQueries({ queryKey: ['/api/clients'] });
      await queryClient.cancelQueries({ queryKey: ['/api/clients', client.id] });
      
      // Rimuovi immediatamente dalla cache
      queryClient.removeQueries({ queryKey: ['/api/clients', client.id] });
      
      // Aggiorna la lista principale rimuovendo il cliente
      queryClient.setQueryData(['/api/clients'], (oldData: any) => {
        if (!oldData) return [];
        const newData = oldData.filter((c: any) => c.id !== client.id);
        return newData;
      });
    },
    onSuccess: async () => {
      
      // Rimozione aggressiva da TUTTE le cache
      queryClient.removeQueries({ queryKey: ['/api/clients', client.id] });
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      await queryClient.refetchQueries({ queryKey: ['/api/clients'] });
      
      toast({
        title: t('notifications.clientDeleted'),
        description: t('i18nFinale.clientCard.deleted', '{{name}} deleted', { name: `${client.firstName} ${client.lastName}` }),
      });
      
      if (onUpdate) {
        onUpdate();
      }
    },
    onError: async (error: any) => {
      console.error(`❌ Error deleting client ${client.id}:`, error);
      
      // Anche in caso di errore, rimuovi dalla cache se è 404
      if (error.message?.includes("Client not found") || error.message?.includes("404")) {
        
        // Rimozione completa dalla cache
        queryClient.removeQueries({ queryKey: ['/api/clients', client.id] });
        await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        
        toast({
          title: t('notifications.clientDeleted'),
          description: t('i18nFinale.clientCard.clientRemoved'),
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
    
    // Invalida completamente la cache
    await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
    
    // Forza il refetch dei dati
    await queryClient.refetchQueries({ queryKey: ['/api/clients'] });
    
    // Chiama il callback se presente
    if (onUpdate) {
      await onUpdate();
    }
    
  };
  
  const handleDelete = () => {
    deleteMutation.mutate();
  };
  
  // Determina se il cliente è importato
  const isImported = client?.originalOwnerId !== undefined;
  
  // Determina se il cliente è stato eliminato alla fonte
  const isDeletedAtSource = client?.deletedAtSource === true;
  
  // Determina se la cancellazione è stata sbloccata
  const isDeletionUnlocked = client?.deletionUnlocked === true;

  const isIncompleteData = !client.phone || client.phone.trim() === '';

  const pastelPalette = [
    'bg-sky-50 border-sky-200',
    'bg-violet-50 border-violet-200',
    'bg-emerald-50 border-emerald-200',
    'bg-rose-50 border-rose-200',
    'bg-amber-50 border-amber-200',
    'bg-teal-50 border-teal-200',
    'bg-indigo-50 border-indigo-200',
    'bg-fuchsia-50 border-fuchsia-200',
  ];
  const defaultCardColor = pastelPalette[client.id % pastelPalette.length];

  return (
    <Card ref={cardRef} className={`h-full ${isDeletedAtSource ? 'border-red-300 bg-red-50/50' : isIncompleteData ? 'border-red-400 bg-red-50/30' : isOtherAccount ? 'border-orange-200 bg-orange-50/30' : defaultCardColor}`}>
      {/* Notifica cliente eliminato alla fonte */}
      {isDeletedAtSource && (
        <div className="bg-red-100 px-3 py-2 text-xs text-red-800 font-medium border-b border-red-200 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>⚠️ {t('i18nFinale.clientCardExtra.deletedFromSourceBadge')}</span>
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
              {t('i18nFinale.clientCardExtra.unlockDeletion')}
            </Button>
          )}
          {isDeletionUnlocked && (
            <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800">
              {t('i18nFinale.clientCardExtra.deletionUnlockedBadge')}
            </Badge>
          )}
        </div>
      )}
      
      {/* Notifica altro account (solo se non eliminato alla fonte) */}
      {isOtherAccount && !isDeletedAtSource && (
        <div className="bg-orange-100 px-3 py-1 text-xs text-orange-800 font-medium border-b border-orange-200">
          👥 {t('i18nFinale.clientCardExtra.otherAccountClient')}
        </div>
      )}
      {isIncompleteData && !isDeletedAtSource && (
        <div className="bg-red-500 px-3 py-2 text-xs text-white font-medium border-b border-red-600 flex items-center gap-2">
          <UserCog className="h-4 w-4" />
          {t('i18nFinale.clientCard.incompleteData')}
        </div>
      )}
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium flex items-center flex-wrap gap-1.5">
              <span>
                {client.firstName} {client.lastName}
              </span>
              {client.isFrequent && (
                <Star className="h-4 w-4 text-pink-500" />
              )}
              {client.isDemo && (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-wide border-gray-300 text-gray-500 bg-gray-100"
                  data-testid={`badge-demo-client-${client.id}`}
                >
                  {t('common.demoLabel')}
                </Badge>
              )}
            </h3>
            {client.phone && client.phone.trim() !== '' && (
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                {client.phone}
              </div>
            )}
            
            {client.email && (
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                {client.email}
              </div>
            )}
            
            {(client.newUniqueCode || client.uniqueCode) && typeof (client.newUniqueCode || client.uniqueCode) === 'string' && (
              <div className="flex items-center text-xs text-blue-600 mt-1 font-mono">
                <span className="bg-blue-50 px-2 py-1 rounded border">
                  {client.newUniqueCode || client.uniqueCode}
                </span>
              </div>
            )}
            
            {/* TOKEN QR - Invisibile di default, visibile al hover */}
            {clientToken && (
              <div className="flex items-center text-xs text-orange-600 mt-2 font-mono">
                <span className="bg-orange-50 px-2 py-1 rounded border border-orange-200 relative group cursor-pointer">
                  <span className="text-orange-400">TOKEN: ••••••••••••••••••••</span>
                  <span className="absolute inset-0 px-2 py-1 bg-orange-50 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    TOKEN: {clientToken.substring(0, 20)}...{clientToken.substring(-8)}
                  </span>
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isOtherAccount ? (
              <>
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
                {t('i18nFinale.clientCardExtra.viewOnlyBadge')}
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
              <Badge variant="outline" className="ml-2 cursor-help">
                <Eye className="h-3 w-3 mr-1 text-blue-500" />
                {(client as any).accessCount || 0}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-6 pb-6 pt-4 border-t flex flex-col gap-3">
        {!isOtherAccount && (
          <Dialog open={isClientFormOpen} onOpenChange={setIsClientFormOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Pencil className="h-4 w-4" />
                {t('clients.details.clientDataConsent')}
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
        )}
        
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
            {clientToken && (
              <div className="flex items-center gap-1 mt-2 w-full justify-center flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => {
                    const link = `${window.location.origin}/auto-login?token=${clientToken}&clientId=${client.id}`;
                    navigator.clipboard.writeText(link).then(() => {
                      toast({ title: t('clients.share.linkCopied'), description: t('clients.share.linkCopiedDesc') });
                    });
                  }}
                >
                  <Copy className="h-3 w-3" />
                  {t('clients.share.copyLink')}
                </Button>
                {contactInfo?.phone && contactInfo.phone.trim() !== '' && client.phone && client.phone.trim() !== '' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                    onClick={() => {
                      const link = `${window.location.origin}/auto-login?token=${clientToken}&clientId=${client.id}`;
                      const text = t('clients.share.messageText', { name: client.firstName });
                      window.open(`https://wa.me/${client.phone?.replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(text + '\n' + link)}`, '_blank');
                    }}
                  >
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </Button>
                )}
                {contactInfo?.email && contactInfo.email.trim() !== '' && client.email && client.email.trim() !== '' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700"
                    onClick={() => {
                      const link = `${window.location.origin}/auto-login?token=${clientToken}&clientId=${client.id}`;
                      const subject = t('clients.share.emailSubject');
                      const body = t('clients.share.messageText', { name: client.firstName }) + '\n\n' + link;
                      window.open(`mailto:${client.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                    }}
                  >
                    <Mail className="h-3 w-3" />
                    {t('i18nFinale.clientCardExtra.emailButton')}
                  </Button>
                )}
              </div>
            )}
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
