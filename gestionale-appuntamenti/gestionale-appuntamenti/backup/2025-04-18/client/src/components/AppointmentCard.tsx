import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatTime } from "@/lib/utils/date";
import { Pencil, Trash2, Star, Info, Phone, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { AppointmentWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
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
import AppointmentForm from "./AppointmentForm";

interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  onUpdate?: () => void;
  compact?: boolean; // Aggiunto per supportare la visualizzazione compatta nei mini-slot
}

export default function AppointmentCard({ appointment, onUpdate, compact = false }: AppointmentCardProps) {
  const { toast } = useToast();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/appointments/${appointment.id}`);
    },
    onSuccess: async () => {
      toast({
        title: "Appuntamento eliminato",
        description: "L'appuntamento è stato eliminato con successo",
      });
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments/date'] });
      
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
  
  // Get color based on service color or apply defaults
  const getBorderColor = () => {
    if (appointment.service.color) {
      return appointment.service.color;
    }
    return appointment.client.isFrequent ? "rgb(236, 72, 153)" : "rgb(59, 130, 246)";
  };
  
  // Get background color based on service color with opacity
  const getBackgroundColor = () => {
    if (appointment.service.color) {
      // Convert color to RGB and add transparency
      if (appointment.service.color.startsWith('#')) {
        // Hex color
        return `${appointment.service.color}20`; // 20 is hex for 12% opacity
      } else if (appointment.service.color.startsWith('rgb')) {
        // RGB color - replace with rgba
        return appointment.service.color.replace('rgb', 'rgba').replace(')', ', 0.12)');
      }
    }
    
    return appointment.client.isFrequent ? "rgba(236, 72, 153, 0.12)" : "rgba(59, 130, 246, 0.12)";
  };
  
  // Versione compatta per i mini-slot da 15 minuti
  if (compact) {
    // Formatta gli orari di inizio e fine
    const startTime = formatTime(new Date(`2000-01-01T${appointment.startTime}`));
    const endTime = formatTime(new Date(`2000-01-01T${appointment.endTime}`));
    
    return (
      <div 
        className="py-1.5 px-2 rounded shadow mb-1 w-full flex flex-col"
        style={{ 
          borderLeft: `4px solid ${getBorderColor()}`,
          backgroundColor: getBackgroundColor()
        }}
      >
        <div className="flex justify-between items-center">
          <div className="truncate mr-1 flex-grow">
            <div className="font-medium text-xs truncate flex items-center">
              <span className="font-bold">{appointment.client.firstName} {appointment.client.lastName}</span>
            </div>
            <div className="text-xs text-gray-700 truncate mt-0.5">
              <span className="font-medium">{appointment.service.name}</span>
            </div>
            <div className="text-xs text-gray-600 truncate mt-0.5">
              {startTime} - {endTime}
            </div>
          </div>
          
          <div className="flex">
            <button 
              className="h-6 w-6 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                setIsFormDialogOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            
            {isFormDialogOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <AppointmentForm 
                    appointmentId={appointment.id} 
                    onClose={() => {
                      setIsFormDialogOpen(false);
                      if (onUpdate) onUpdate();
                    }} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Versione standard per la visualizzazione normale
  return (
    <div 
      className="p-3 rounded-md shadow-sm mb-2"
      style={{ 
        borderLeft: `4px solid ${getBorderColor()}`,
        backgroundColor: getBackgroundColor()
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">
            {appointment.client.firstName} {appointment.client.lastName}
          </div>
          <div className="text-sm text-gray-600">
            {appointment.service.name} ({formatTime(new Date(`2000-01-01T${appointment.startTime}`))}) - {appointment.service.duration} min
          </div>
          <div className="flex items-center text-sm mt-1">
            <Phone className="h-3.5 w-3.5 mr-1 text-gray-500" />
            <span className="text-gray-600">{appointment.client.phone}</span>
          </div>
        </div>

        <div className="flex space-x-1 items-start">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-500 hover:text-primary hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              if (isFormDialogOpen) {
                setIsFormDialogOpen(false);
              } else if (isExpanded) {
                setIsExpanded(false);
              } else {
                setIsExpanded(true);
              }
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
          
          {isExpanded && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-500 hover:text-primary hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                setIsFormDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          
          {isFormDialogOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <AppointmentForm 
                  appointmentId={appointment.id} 
                  onClose={() => {
                    setIsFormDialogOpen(false);
                    if (onUpdate) onUpdate();
                  }} 
                />
              </div>
            </div>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Elimina appuntamento</AlertDialogTitle>
                <AlertDialogDescription>
                  Sei sicuro di voler eliminare questo appuntamento? Questa azione non può essere annullata.
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
      
      {/* Informazioni dettagliate (visibili solo quando espanso) */}
      {isExpanded && (
        <div className="mt-3 pt-2 border-t border-gray-200 space-y-2">
          {/* Client info */}
          <div className="space-y-1">
            {appointment.client.isFrequent && (
              <div className="flex items-center text-sm">
                <Star className="h-3.5 w-3.5 mr-1 text-pink-500" />
                <span className="text-gray-600">Cliente frequente</span>
              </div>
            )}
            
            {!appointment.client.hasConsent && (
              <div className="flex items-center text-sm">
                <Info className="h-3.5 w-3.5 mr-1 text-amber-500" />
                <span className="text-gray-600">Consenso non fornito</span>
              </div>
            )}
          </div>
          
          {/* Notes */}
          {appointment.notes && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Note:</span> {appointment.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
