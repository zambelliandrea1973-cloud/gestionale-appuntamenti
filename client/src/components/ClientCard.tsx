import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Client } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Star, Info, Phone, Mail, Calendar, FileText, QrCode, ExternalLink } from "lucide-react";
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

interface ClientCardProps {
  client: Client;
  onUpdate?: () => void;
}

export default function ClientCard({ client, onUpdate }: ClientCardProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [_, setLocation] = useLocation();
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [qrCodeModalTab, setQrCodeModalTab] = useState<"qrcode" | "link">("qrcode");
  const [clientQrCode, setClientQrCode] = useState<string | null>(null);
  
  // Verifica se esiste già un token per questo cliente
  useEffect(() => {
    const checkExistingQrCode = async () => {
      try {
        const response = await apiRequest("GET", `/api/clients/${client.id}/activation-token`);
        const data = await response.json();
        
        if (data && data.qrCode) {
          setClientQrCode(data.qrCode);
        }
      } catch (error) {
        console.error(t('errors.qrCodeFetchError'), error);
      }
    };
    
    checkExistingQrCode();
  }, [client.id]);
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/clients/${client.id}`);
    },
    onSuccess: async () => {
      toast({
        title: t('notifications.clientDeleted'),
        description: t('notifications.clientDeletedSuccess'),
      });
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      if (onUpdate) {
        onUpdate();
      }
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: t('errors.genericError', { error: error.message }),
        variant: "destructive",
      });
    }
  });
  
  const handleDelete = () => {
    deleteMutation.mutate();
  };
  
  return (
    <Card className="h-full">
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
          </div>
          
          <div className="flex">
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
          
          <div className="flex items-center mt-2">
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
      </CardFooter>
    </Card>
  );
}
