import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, X } from "lucide-react";
import { AppointmentWithDetails } from "../../../shared/schema";
import { Button } from "@/components/ui/button";
import AppointmentForm from "./AppointmentForm";

interface AppointmentCardSmallProps {
  appointment: AppointmentWithDetails;
  onUpdate?: () => void;
  view: "week" | "month";
}

export default function AppointmentCardSmall({ 
  appointment, 
  onUpdate,
  view 
}: AppointmentCardSmallProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/appointments/${appointment.id}`);
    },
    onSuccess: async () => {
      toast({
        title: t('appointment.deleted'),
        description: t('appointment.deletedDesc'),
      });
      
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      const dateKey = `/api/appointments/date/${appointment.date}`;
      await queryClient.invalidateQueries({ queryKey: [dateKey] });
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments/range'] });
      
      setIsDeleteConfirmOpen(false);
      if (onUpdate) {
        onUpdate();
      }
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: t('appointment.errorOccurred', { message: error.message }),
        variant: "destructive",
      });
    }
  });
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    deleteMutation.mutate();
  };
  
  const getBorderColor = () => {
    if (appointment.service?.color) {
      return appointment.service.color;
    }
    return appointment.client?.isFrequent ? "rgb(236, 72, 153)" : "rgb(59, 130, 246)";
  };
  
  const getBackgroundColor = () => {
    if (appointment.service?.color) {
      if (appointment.service.color.startsWith('#')) {
        return `${appointment.service.color}20`;
      } else if (appointment.service.color.startsWith('rgb')) {
        return appointment.service.color.replace('rgb', 'rgba').replace(')', ', 0.12)');
      }
    }
    return appointment.client?.isFrequent ? "rgba(236, 72, 153, 0.12)" : "rgba(59, 130, 246, 0.12)";
  };
  
  return (
    <>
      <div 
        className="relative group"
        data-appointment-card="true"
        style={{
          borderLeft: `2px solid ${getBorderColor()}`,
          backgroundColor: getBackgroundColor()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-medium truncate text-xs p-1">
          {view === "week" ? (
            <>
              <div className="truncate">{appointment.client?.firstName} {appointment.client?.lastName}</div>
              <div className="text-xs opacity-75">{appointment.startTime?.substring(0, 5)}</div>
              <div className="text-xs opacity-60 truncate">{appointment.service?.name}</div>
            </>
          ) : (
            <>
              <div className="truncate">{appointment.startTime?.substring(0, 5)} {appointment.client?.firstName}</div>
              <div className="text-xs opacity-60 truncate">{appointment.service?.name}</div>
            </>
          )}
        </div>
        
        <div 
          className={`
            absolute top-0 right-0 hidden group-hover:flex space-x-1 bg-white bg-opacity-90 rounded-bl-md shadow-sm
            ${view === "month" ? "p-0.5" : "p-1"}
          `}
          data-appointment-icons="true"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            className={`${view === "month" ? "h-4 w-4" : "h-5 w-5"} p-0 text-gray-500 hover:text-primary hover:bg-gray-100`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsFormDialogOpen(true);
            }}
          >
            <Pencil className={`${view === "month" ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={`${view === "month" ? "h-4 w-4" : "h-5 w-5"} p-0 text-gray-500 hover:text-red-500 hover:bg-gray-100`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsDeleteConfirmOpen(true);
            }}
          >
            <Trash2 className={`${view === "month" ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
          </Button>
        </div>
      </div>
      
      {isDeleteConfirmOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsDeleteConfirmOpen(false);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{t('appointment.confirmDeleteTitle')}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsDeleteConfirmOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-gray-600 mb-6">
              {t('appointment.confirmDeleteDescription')}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsDeleteConfirmOpen(false);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {isFormDialogOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsFormDialogOpen(false);
          }}
        >
          <div 
            className="relative"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
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
    </>
  );
}
