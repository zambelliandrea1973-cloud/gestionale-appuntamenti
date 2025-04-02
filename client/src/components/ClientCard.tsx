import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@shared/schema";
import { Pencil, Trash2, Star, Info, Phone, Mail, Calendar } from "lucide-react";
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
import AppointmentForm from "./AppointmentForm";

interface ClientCardProps {
  client: Client;
  onUpdate?: () => void;
}

export default function ClientCard({ client, onUpdate }: ClientCardProps) {
  const { toast } = useToast();
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/clients/${client.id}`);
    },
    onSuccess: async () => {
      toast({
        title: "Cliente eliminato",
        description: "Il cliente è stato eliminato con successo",
      });
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      if (onUpdate) {
        onUpdate();
      }
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
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
                  <AlertDialogTitle>Elimina cliente</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sei sicuro di voler eliminare questo cliente? Verranno eliminati anche tutti i suoi appuntamenti. Questa azione non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          {client.address && (
            <div className="text-sm">
              <span className="font-medium">Indirizzo:</span> {client.address}
            </div>
          )}
          
          {client.birthday && (
            <div className="text-sm">
              <span className="font-medium">Data di nascita:</span> {new Date(client.birthday).toLocaleDateString('it-IT')}
            </div>
          )}
          
          {!client.hasConsent && (
            <div className="flex items-center mt-2">
              <Badge variant="outline" className="flex items-center text-amber-600 border-amber-200 bg-amber-50">
                <Info className="h-3 w-3 mr-1" />
                Consenso non fornito
              </Badge>
            </div>
          )}
          
          {(client.medicalNotes || client.allergies) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium mb-1">Informazioni mediche:</h4>
              {client.allergies && (
                <div className="text-sm mt-1">
                  <span className="font-medium">Allergie:</span> {client.allergies}
                </div>
              )}
              {client.medicalNotes && (
                <div className="text-sm mt-1">
                  <span className="font-medium">Note mediche:</span> {client.medicalNotes}
                </div>
              )}
            </div>
          )}
          
          {client.notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium mb-1">Note:</h4>
              <p className="text-sm text-gray-600">{client.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="justify-end pt-2">
        <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Nuovo appuntamento
            </Button>
          </DialogTrigger>
          <AppointmentForm 
            onClose={() => {
              console.log("Chiusura form appuntamento dalla scheda cliente");
              setIsAppointmentFormOpen(false);
            }}
            defaultDate={new Date()}
            defaultTime="09:00"
            clientId={client.id}
          />
        </Dialog>
      </CardFooter>
    </Card>
  );
}
