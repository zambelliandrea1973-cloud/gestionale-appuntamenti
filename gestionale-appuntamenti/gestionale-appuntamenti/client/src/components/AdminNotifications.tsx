import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bell, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminNotification {
  id: number;
  type: string;
  message: string;
  userId: number;
  userEmail: string;
  clientId: number;
  clientName: string;
  timestamp: string;
  read: boolean;
}

export default function AdminNotifications() {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/admin/notifications'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/notifications");
      if (!response.ok) throw new Error("Errore nel caricamento notifiche");
      return response.json();
    },
    refetchInterval: 30000, // Ricarica ogni 30 secondi
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest("POST", `/api/admin/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
    },
  });

  const unreadCount = notifications.filter((n: AdminNotification) => !n.read).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifiche Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifiche Admin
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} nuove
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessuna notifica disponibile
          </p>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {notifications.map((notification: AdminNotification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    notification.read 
                      ? 'bg-muted/30 border-muted' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                        <span className="text-sm font-medium">
                          Eliminazione Cliente
                        </span>
                        {!notification.read && (
                          <Badge variant="destructive" className="ml-2 h-5 text-xs">
                            NUOVO
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>
                          {new Date(notification.timestamp).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        className="ml-2 h-7 px-2"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Segna letta
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}