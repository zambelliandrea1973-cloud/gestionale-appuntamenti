import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, AlertCircle, Calendar as CalendarIcon, User, DoorOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BookingRequest {
  id: number;
  clientId: number;
  clientName?: string;
  serviceId: number;
  serviceName?: string;
  staffId?: number | null;
  requestedDate: string;
  requestedTimeStart: string;
  requestedTimeEnd: string;
  proposedSlots: { start: string; end: string }[];
  selectedSlot?: { start: string; end: string };
  status: 'slots_proposed' | 'client_selected' | 'admin_confirmed' | 'rejected';
  clientNotes?: string;
  createdAt: string;
}

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
}

interface TreatmentRoom {
  id: number;
  name: string;
  isActive: boolean;
}

export default function BookingRequests() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [manualStaffId, setManualStaffId] = useState<string>("");
  const [manualRoomId, setManualRoomId] = useState<string>("");
  
  // Query booking requests
  const { data: allRequests = [], isLoading } = useQuery<BookingRequest[]>({
    queryKey: ['/api/booking-requests'],
    queryFn: async () => {
      const res = await fetch('/api/booking-requests', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to load booking requests');
      return res.json();
    }
  });
  
  // Query collaboratori per mappare staffId → nome
  const { data: staffList = [] } = useQuery<StaffMember[]>({
    queryKey: ['/api/collaborators'],
    queryFn: async () => {
      const res = await fetch('/api/collaborators', {
        credentials: 'include'
      });
      if (!res.ok) return [];
      return res.json();
    }
  });
  
  // Query stanze per selezione manuale
  const { data: roomsList = [] } = useQuery<TreatmentRoom[]>({
    queryKey: ['/api/treatment-rooms'],
    queryFn: async () => {
      const res = await fetch('/api/treatment-rooms', {
        credentials: 'include'
      });
      if (!res.ok) return [];
      return res.json();
    }
  });
  
  // Filter requests based on active tab
  const requests = activeTab === 'pending' 
    ? allRequests.filter(r => r.status === 'client_selected' || r.status === 'slots_proposed')
    : allRequests;
  
  // Count by status for badges
  const pendingCount = allRequests.filter(r => r.status === 'client_selected' || r.status === 'slots_proposed').length;
  const confirmedCount = allRequests.filter(r => r.status === 'admin_confirmed').length;
  const rejectedCount = allRequests.filter(r => r.status === 'rejected').length;
  
  // Approve mutation con supporto override staff/room
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, staffId, roomId }: { requestId: number, staffId?: number, roomId?: number }) => {
      const body: any = {};
      if (staffId) body.staffId = staffId;
      if (roomId) body.roomId = roomId;
      
      const res = await fetch(`/api/booking-requests/${requestId}/confirm`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to confirm request');
      }
      return res.json();
    },
    onSuccess: () => {
      setConfirmDialogOpen(false);
      setSelectedRequestId(null);
      setManualStaffId("");
      setManualRoomId("");
      queryClient.invalidateQueries({ queryKey: ['/api/booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: t("bookingRequests.requestApproved"),
        description: t("bookingRequests.appointmentCreated")
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("bookingRequests.error"),
        description: error.message || t("bookingRequests.cannotApprove")
      });
    }
  });
  
  // Handler per aprire dialog conferma
  const handleApproveClick = (requestId: number) => {
    setSelectedRequestId(requestId);
    setManualStaffId("");
    setManualRoomId("");
    setConfirmDialogOpen(true);
  };
  
  // Handler per conferma finale
  const handleConfirmApprove = () => {
    if (!selectedRequestId) return;
    
    const params: { requestId: number, staffId?: number, roomId?: number } = {
      requestId: selectedRequestId
    };
    
    if (manualStaffId && manualStaffId !== "auto") {
      params.staffId = parseInt(manualStaffId);
    }
    
    if (manualRoomId && manualRoomId !== "auto") {
      params.roomId = parseInt(manualRoomId);
    }
    
    approveMutation.mutate(params);
  };
  
  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await fetch(`/api/booking-requests/${requestId}/reject`, {
        method: 'PUT',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to reject request');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/booking-requests'] });
      toast({
        variant: "destructive",
        title: t("bookingRequests.requestRejected"),
        description: t("bookingRequests.clientWillBeNotified")
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("bookingRequests.error"),
        description: error.message || t("bookingRequests.cannotReject")
      });
    }
  });
  
  const getStatusConfig = (status: BookingRequest['status']) => {
    const configs = {
      slots_proposed: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700', label: t("bookingRequests.statusChooseSlot"), icon: AlertCircle },
      client_selected: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', label: t("bookingRequests.statusPending"), icon: Clock },
      admin_confirmed: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', label: t("bookingRequests.statusConfirmed"), icon: CheckCircle },
      rejected: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', label: t("bookingRequests.statusRejected"), icon: XCircle }
    };
    return configs[status];
  };
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("bookingRequests.title")}</h1>
        <p className="text-gray-600 mt-1">{t("bookingRequests.subtitle")}</p>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("bookingRequests.toManage")}</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("bookingRequests.confirmed")}</p>
                <p className="text-3xl font-bold text-green-600">{confirmedCount}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("bookingRequests.rejected")}</p>
                <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'all')}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" data-testid="tab-pending">
            {t("bookingRequests.tabToManage")} ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            {t("bookingRequests.tabAll")} ({allRequests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {activeTab === 'pending' ? t("bookingRequests.noRequestsToManage") : t("bookingRequests.noRequestsFound")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const config = getStatusConfig(request.status);
                const Icon = config.icon;
                const canApprove = request.status === 'client_selected' && request.selectedSlot;
                const canReject = request.status !== 'admin_confirmed' && request.status !== 'rejected';
                const preferredStaff = request.staffId ? staffList.find(s => s.id === request.staffId) : null;
                
                return (
                  <Card key={request.id} className={`border-l-4 ${config.border}`} data-testid={`booking-request-${request.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            {request.clientName || `Cliente #${request.clientId}`}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {request.serviceName || `Servizio #${request.serviceId}`}
                            {preferredStaff && (
                              <span className="ml-2 text-blue-600 font-medium">
                                • {t("bookingRequests.preference")} {preferredStaff.firstName} {preferredStaff.lastName}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge className={`${config.bg} ${config.text} border-0 flex items-center gap-1`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CalendarIcon className="h-4 w-4" />
                          {new Date(request.requestedDate).toLocaleDateString('it-IT', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        
                        <div className="text-sm">
                          <span className="font-medium">{t("bookingRequests.requestedTimeSlot")}</span> {request.requestedTimeStart} - {request.requestedTimeEnd}
                        </div>
                        
                        {request.selectedSlot && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <span className="font-medium text-blue-900">{t("bookingRequests.clientSelectedSlot")}</span>
                            <p className="text-blue-700 font-semibold mt-1">
                              {request.selectedSlot.start} - {request.selectedSlot.end}
                            </p>
                          </div>
                        )}
                        
                        {request.proposedSlots && request.proposedSlots.length > 0 && !request.selectedSlot && (
                          <div className="text-sm">
                            <span className="font-medium">{t("bookingRequests.proposedSlots")}</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {request.proposedSlots.map((slot, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {slot.start} - {slot.end}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {request.clientNotes && (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <span className="font-medium text-gray-700">{t("bookingRequests.clientNotes")}</span>
                            <p className="text-gray-600 mt-1 italic">"{request.clientNotes}"</p>
                          </div>
                        )}
                        
                        {(canApprove || canReject) && (
                          <div className="space-y-2 pt-3 border-t">
                            {canApprove && (
                              <Button 
                                onClick={() => handleApproveClick(request.id)}
                                disabled={approveMutation.isPending}
                                className="w-full"
                                data-testid={`button-approve-${request.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">{t("bookingRequests.approveAndCreate")}</span>
                                <span className="sm:hidden">{t("bookingRequests.approve")}</span>
                              </Button>
                            )}
                            {canReject && (
                              <Button 
                                onClick={() => rejectMutation.mutate(request.id)}
                                disabled={rejectMutation.isPending}
                                variant="destructive"
                                className="w-full"
                                data-testid={`button-reject-${request.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">{t("bookingRequests.reject")}</span>
                                <span className="sm:hidden">{t("bookingRequests.no")}</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Dialog conferma con selezione staff/stanza */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="min-[1200px]:max-w-[500px]" data-testid="dialog-confirm-booking">
          <DialogHeader>
            <DialogTitle>{t("bookingRequests.confirmAppointment")}</DialogTitle>
            <DialogDescription>
              {t("bookingRequests.confirmAppointmentDesc")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Mostra preferenza cliente se presente */}
            {selectedRequestId && allRequests.find(r => r.id === selectedRequestId)?.staffId && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <User className="h-4 w-4 inline mr-1" />
                  {t("bookingRequests.clientRequested")} {staffList.find(s => s.id === allRequests.find(r => r.id === selectedRequestId)?.staffId)?.firstName} {staffList.find(s => s.id === allRequests.find(r => r.id === selectedRequestId)?.staffId)?.lastName}
                </p>
              </div>
            )}
            
            {/* Select Collaboratore */}
            <div className="space-y-2">
              <Label htmlFor="staff-select">{t("bookingRequests.collaborator")}</Label>
              <Select value={manualStaffId} onValueChange={setManualStaffId}>
                <SelectTrigger id="staff-select" data-testid="select-staff">
                  <SelectValue placeholder={t("bookingRequests.autoAssignment")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" data-testid="select-staff-auto">{t("bookingRequests.autoAssignment")}</SelectItem>
                  {staffList.map(staff => (
                    <SelectItem key={staff.id} value={staff.id.toString()} data-testid={`select-staff-${staff.id}`}>
                      {staff.firstName} {staff.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Select Stanza */}
            <div className="space-y-2">
              <Label htmlFor="room-select">{t("bookingRequests.room")}</Label>
              <Select value={manualRoomId} onValueChange={setManualRoomId}>
                <SelectTrigger id="room-select" data-testid="select-room">
                  <SelectValue placeholder={t("bookingRequests.autoAssignment")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" data-testid="select-room-auto">{t("bookingRequests.autoAssignment")}</SelectItem>
                  {roomsList.filter(r => r.isActive).map(room => (
                    <SelectItem key={room.id} value={room.id.toString()} data-testid={`select-room-${room.id}`}>
                      <DoorOpen className="h-4 w-4 inline mr-1" />
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              data-testid="button-cancel-confirm"
            >
              {t("bookingRequests.cancel")}
            </Button>
            <Button
              onClick={handleConfirmApprove}
              disabled={approveMutation.isPending}
              data-testid="button-final-confirm"
            >
              {approveMutation.isPending ? t("bookingRequests.creating") : t("bookingRequests.confirmAndCreate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
