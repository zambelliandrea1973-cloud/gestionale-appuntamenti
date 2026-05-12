import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, X, Clock, User, Briefcase, Users, DoorOpen } from "lucide-react";
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

  // Popover (week view only)
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPopover = view === "week" && (isHovered || isPinned);

  const calcPosition = useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const popoverWidth = 244;
    const popoverHeight = 190;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer right side, fall back to left
    let left = rect.right + 6;
    if (left + popoverWidth > vw - 8) left = rect.left - popoverWidth - 6;
    if (left < 8) left = 8;

    // Align top with card, clamp to viewport
    let top = rect.top;
    if (top + popoverHeight > vh - 8) top = vh - popoverHeight - 8;
    if (top < 8) top = 8;

    setPopoverPos({ top, left });
  }, []);

  const handleMouseEnter = () => {
    if (view !== "week") return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    calcPosition();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (view !== "week") return;
    // Small delay so mouse can move into the popover itself
    hoverTimeout.current = setTimeout(() => setIsHovered(false), 120);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (view !== "week") return;
    if (!isPinned) calcPosition();
    setIsPinned((p) => !p);
  };

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
      setIsPinned(false);
      if (onUpdate) onUpdate();
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
    if (appointment.service?.color) return appointment.service.color;
    return appointment.client?.isFrequent ? "rgb(236, 72, 153)" : "rgb(59, 130, 246)";
  };
  
  const getBackgroundColor = () => {
    if (appointment.service?.color) {
      if (appointment.service.color.startsWith('#')) return `${appointment.service.color}20`;
      if (appointment.service.color.startsWith('rgb'))
        return appointment.service.color.replace('rgb', 'rgba').replace(')', ', 0.12)');
    }
    return appointment.client?.isFrequent ? "rgba(236, 72, 153, 0.12)" : "rgba(59, 130, 246, 0.12)";
  };

  const endTime = (() => {
    if (!appointment.startTime || !appointment.service?.duration) return null;
    const [h, m] = appointment.startTime.split(':').map(Number);
    const totalMin = h * 60 + m + (appointment.service.duration || 0);
    return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
  })();

  return (
    <>
      <div 
        ref={cardRef}
        className="relative group cursor-pointer"
        data-appointment-card="true"
        style={{
          borderLeft: `2px solid ${getBorderColor()}`,
          backgroundColor: getBackgroundColor()
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
      >
        <div className="font-medium truncate text-xs p-1">
          {view === "week" ? (
            <>
              <div className="truncate font-semibold leading-tight">{appointment.startTime?.substring(0, 5)} · {appointment.client?.firstName} {appointment.client?.lastName}</div>
              <div className="text-xs opacity-60 truncate leading-tight">{appointment.service?.name}</div>
            </>
          ) : (
            <>
              <div className="truncate">{appointment.startTime?.substring(0, 5)} {appointment.client?.firstName}</div>
              <div className="text-xs opacity-60 truncate">{appointment.service?.name}</div>
            </>
          )}
        </div>
        
        {/* Quick action icons (month view or non-hover) */}
        {view === "month" && (
          <div 
            className="absolute top-0 right-0 hidden group-hover:flex space-x-1 bg-white bg-opacity-90 rounded-bl-md shadow-sm p-0.5"
            data-appointment-icons="true"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost" size="icon"
              className="h-4 w-4 p-0 text-gray-500 hover:text-primary hover:bg-gray-100"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsFormDialogOpen(true); }}
            >
              <Pencil className="h-2.5 w-2.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-4 w-4 p-0 text-gray-500 hover:text-red-500 hover:bg-gray-100"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsDeleteConfirmOpen(true); }}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Week-view detail popover ── */}
      {showPopover && (
        <div
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl p-3 w-60"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onMouseEnter={() => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); setIsHovered(true); }}
          onMouseLeave={() => { setIsHovered(false); }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ background: getBackgroundColor(), color: getBorderColor() }}
            >
              {appointment.status || 'scheduled'}
            </div>
            <button
              className="text-gray-400 hover:text-gray-700 ml-auto"
              onClick={(e) => { e.stopPropagation(); setIsPinned(false); setIsHovered(false); }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="font-medium">
                {appointment.startTime?.substring(0, 5)}
                {endTime ? ` – ${endTime}` : ''}
                {appointment.service?.duration ? ` (${appointment.service.duration} min)` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="font-semibold truncate">{appointment.client?.firstName} {appointment.client?.lastName}</span>
            </div>
            {appointment.service && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{appointment.service.name}</span>
              </div>
            )}
            {(appointment as any).staff && (
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{(appointment as any).staff.firstName} {(appointment as any).staff.lastName}</span>
              </div>
            )}
            {(appointment as any).room && (
              <div className="flex items-center gap-2">
                <DoorOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{(appointment as any).room.name}</span>
              </div>
            )}
            {appointment.notes && (
              <div className="text-xs text-gray-500 mt-1 pt-1 border-t truncate">{appointment.notes}</div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3 pt-2 border-t">
            <Button
              size="sm" variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); setIsPinned(false); setIsHovered(false); setIsFormDialogOpen(true); }}
            >
              <Pencil className="h-3 w-3 mr-1" /> {t('common.edit', 'Modifica')}
            </Button>
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs text-red-500 hover:text-red-700 hover:border-red-300"
              onClick={(e) => { e.stopPropagation(); setIsPinned(false); setIsHovered(false); setIsDeleteConfirmOpen(true); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsDeleteConfirmOpen(false); }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{t('appointment.confirmDeleteTitle')}</h3>
              <Button
                variant="ghost" size="icon" className="h-6 w-6 p-0"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsDeleteConfirmOpen(false); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-gray-600 mb-6">{t('appointment.confirmDeleteDescription')}</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsDeleteConfirmOpen(false); }}
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
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center pt-3 sm:pt-0 z-[9999] overflow-y-auto"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsFormDialogOpen(false); }}
        >
          <div 
            className="relative"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          >
            <AppointmentForm 
              appointmentId={appointment.id} 
              onClose={() => { setIsFormDialogOpen(false); if (onUpdate) onUpdate(); }} 
            />
          </div>
        </div>
      )}
    </>
  );
}
