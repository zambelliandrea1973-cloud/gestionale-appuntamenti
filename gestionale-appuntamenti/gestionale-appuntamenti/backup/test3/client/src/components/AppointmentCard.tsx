import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatTime } from "@/lib/utils/date";
import { Pencil, Trash2, Star, Info, Phone } from "lucide-react";
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
}

export default function AppointmentCard({ appointment, onUpdate }: AppointmentCardProps) {
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
            {appointment.service.name} - {appointment.service.duration} min ({formatTime(new Date(`2000-01-01T${appointment.startTime}`))})
          </div>
        </div>
        <div className="flex space-x-1">
          <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-primary hover:bg-gray-200">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <AppointmentForm 
              appointmentId={appointment.id} 
              onClose={() => {
                setIsFormDialogOpen(false);
                if (onUpdate) onUpdate();
              }} 
            />
          </Dialog>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-gray-200">
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
      
      {/* Client info */}
      <div className="mt-2 space-y-1">
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
        
        <div className="flex items-center text-sm">
          <Phone className="h-3.5 w-3.5 mr-1 text-gray-500" />
          <span className="text-gray-600">{appointment.client.phone}</span>
        </div>
      </div>
      
      {/* Notes */}
      {appointment.notes && (
        <div className="mt-2 text-sm text-gray-600 border-t pt-2 border-gray-200">
          {appointment.notes}
        </div>
      )}
    </div>
  );
}
