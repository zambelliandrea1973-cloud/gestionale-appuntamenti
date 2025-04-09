import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatTime } from "@/lib/utils/date";
import { Trash2, Pencil } from "lucide-react";
import { AppointmentWithDetails } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import AppointmentForm from "./AppointmentForm";

interface AppointmentCardSmallProps {
  appointment: AppointmentWithDetails;
  onUpdate?: () => void;
  view: "week" | "month"; // Specifica in quale vista siamo
}

export default function AppointmentCardSmall({ 
  appointment, 
  onUpdate,
  view 
}: AppointmentCardSmallProps) {
  const { toast } = useToast();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  
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
      
      // Invalidare anche la vista giornaliera specifica
      const dateKey = `/api/appointments/date/${appointment.date}`;
      await queryClient.invalidateQueries({ queryKey: [dateKey] });
      
      // Invalidare query per range di date (per vista settimanale e mensile)
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments/range'] });
      
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
  
  return (
    <div 
      className="relative group"
      style={{
        borderLeft: `2px solid ${getBorderColor()}`,
        backgroundColor: getBackgroundColor()
      }}
    >
      {/* Contenuto principale - Versione semplificata */}
      <div className="font-medium truncate text-xs p-1">
        {view === "week" ? (
          // Nella vista settimanale mostriamo più dettagli
          <>
            <div className="truncate">{appointment.client.firstName} {appointment.client.lastName}</div>
            <div className="text-xs opacity-75">{appointment.startTime.substring(0, 5)}</div>
          </>
        ) : (
          // Nella vista mensile mostriamo solo il nome e l'orario
          <>
            {appointment.startTime.substring(0, 5)} {appointment.client.firstName}
          </>
        )}
      </div>
      
      {/* Bottoni di azione - appaiono solo al passaggio del mouse */}
      <div className={`
        absolute top-0 right-0 hidden group-hover:flex space-x-1 bg-white bg-opacity-90 rounded-bl-md shadow-sm
        ${view === "month" ? "p-0.5" : "p-1"}
      `}>
        {/* Bottone Modifica */}
        <Button
          variant="ghost"
          size="icon"
          className={`${view === "month" ? "h-4 w-4" : "h-5 w-5"} p-0 text-gray-500 hover:text-primary hover:bg-gray-100`}
          onClick={(e) => {
            e.stopPropagation();
            setIsFormDialogOpen(true);
          }}
        >
          <Pencil className={`${view === "month" ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
        </Button>
        
        {/* Bottone Elimina */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`${view === "month" ? "h-4 w-4" : "h-5 w-5"} p-0 text-gray-500 hover:text-red-500 hover:bg-gray-100`}
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className={`${view === "month" ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
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
      
      {/* Finestra di modifica */}
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
  );
}