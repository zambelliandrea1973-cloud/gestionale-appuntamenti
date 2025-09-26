import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatTime } from "@/lib/utils/date";
import { Pencil, Trash2, Star, Info, Phone, ChevronDown, ChevronUp, Plus, Mail, MessageCircle, CheckCircle2 } from "lucide-react";
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

  // Get treatment room color for the small circle indicator
  const getRoomColor = () => {
    if (!appointment.treatmentRoomId) return null;
    
    // This will be populated from parent component with treatmentRooms data
    // For now, return a default color if room ID exists
    return appointment.treatmentRoomId ? '#10b981' : null; // Default green
  };
  
  // Controlla se siamo su mobile
  const isMobile = window.innerWidth < 768;

  // Funzione per renderizzare i flag di stato promemoria
  const renderReminderFlags = () => {
    if (!appointment.reminderType) return null;
    
    const flags = [];
    
    // Flag per Email
    if (appointment.reminderType.includes('email')) {
      if (appointment.reminderStatus === 'sent') {
        flags.push(
          <div key="email" className="flex items-center gap-1 text-green-600" title="Email promemoria inviata">
            <Mail className="h-3 w-3" />
            <CheckCircle2 className="h-3 w-3" />
          </div>
        );
      } else if (appointment.reminderStatus === 'failed') {
        flags.push(
          <div key="email" className="flex items-center gap-1 text-red-500" title="Invio email fallito">
            <Mail className="h-3 w-3" />
            <span className="text-xs">✗</span>
          </div>
        );
      }
    }
    
    // Flag per WhatsApp
    if (appointment.reminderType.includes('whatsapp')) {
      if (appointment.reminderStatus === 'sent') {
        flags.push(
          <div key="whatsapp" className="flex items-center gap-1 text-green-600" title="WhatsApp promemoria inviato">
            <MessageCircle className="h-3 w-3" />
            <CheckCircle2 className="h-3 w-3" />
          </div>
        );
      } else if (appointment.reminderStatus === 'failed') {
        flags.push(
          <div key="whatsapp" className="flex items-center gap-1 text-red-500" title="Invio WhatsApp fallito">
            <MessageCircle className="h-3 w-3" />
            <span className="text-xs">✗</span>
          </div>
        );
      }
    }
    
    return flags.length > 0 ? (
      <div className="flex gap-2 mt-1">
        {flags}
      </div>
    ) : null;
  };

  // Versione compatta per i mini-slot da 15 minuti
  if (compact) {
    // Formatta gli orari di inizio e fine
    const startTime = formatTime(new Date(`2000-01-01T${appointment.startTime}`));
    const endTime = formatTime(new Date(`2000-01-01T${appointment.endTime}`));
    
    return (
      <div 
        className={`${isMobile ? 'py-3 px-3' : 'py-1.5 px-2'} rounded shadow mb-1 w-full flex flex-col`}
        style={{ 
          borderLeft: `${isMobile ? '6px' : '4px'} solid ${getBorderColor()}`,
          backgroundColor: getBackgroundColor()
        }}
      >
        <div className="flex justify-between items-center">
          <div className="truncate mr-1 flex-grow">
            <div className={`font-medium ${isMobile ? 'text-sm' : 'text-xs'} truncate flex items-center`}>
              <span className="font-bold">{appointment.client.firstName} {appointment.client.lastName}</span>
              {/* Small room color indicator */}
              {getRoomColor() && (
                <div 
                  className="w-2 h-2 rounded-full ml-2 flex-shrink-0"
                  style={{ backgroundColor: getRoomColor() }}
                  title={`Stanza: ${appointment.treatmentRoomId || 'N/A'}`}
                />
              )}
            </div>
            <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-700 truncate mt-0.5`}>
              <span className="font-medium">{appointment.service.name}</span>
            </div>
            <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-600 truncate mt-0.5`}>
              {startTime} - {endTime}
            </div>
            {renderReminderFlags()}
          </div>
          
          <div className="flex gap-2">
            {isMobile ? (
              <>
                <button 
                  className="h-9 px-2 bg-blue-100 border-2 border-blue-400 text-blue-700 rounded-md flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFormDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  <span className="text-sm">Modifica</span>
                </button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button 
                      className="h-9 px-2 bg-red-600 text-white rounded-md flex items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      <span className="text-sm">Elimina</span>
                    </button>
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
              </>
            ) : (
              <button 
                className="h-6 w-6 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFormDialogOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
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
          </div>
        </div>
      </div>
    );
  }

  // Versione standard per la visualizzazione normale
  return (
    <div 
      className={`${isMobile ? 'p-4' : 'p-3'} rounded-md shadow-sm mb-2`}
      style={{ 
        borderLeft: `${isMobile ? '6px' : '4px'} solid ${getBorderColor()}`,
        backgroundColor: getBackgroundColor()
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className={`font-medium ${isMobile ? 'text-base' : 'text-sm'} flex items-center gap-2`}>
            <span>{appointment.client.firstName} {appointment.client.lastName}</span>
            {/* Small room color indicator */}
            {getRoomColor() && (
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getRoomColor() }}
                title={`Stanza: ${appointment.treatmentRoomId || 'N/A'}`}
              />
            )}
          </div>
          <div className={`${isMobile ? 'text-sm' : 'text-xs'} text-gray-600`}>
            {appointment.service.name} ({formatTime(new Date(`2000-01-01T${appointment.startTime}`))}) - {appointment.service.duration} min
          </div>
          <div className="flex items-center text-sm mt-1">
            <Phone className="h-3.5 w-3.5 mr-1 text-gray-500" />
            <span className="text-gray-600">{appointment.client.phone}</span>
          </div>
          {renderReminderFlags()}
        </div>

        {isMobile ? (
          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-3 text-gray-700 border-gray-300"
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
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  <span>Nascondi</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  <span>Dettagli</span>
                </>
              )}
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 px-3 bg-blue-100 border-blue-400 text-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFormDialogOpen(true);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                <span>{t("common.edit")}</span>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="h-8 px-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span>{t("common.delete")}</span>
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
        ) : (
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
