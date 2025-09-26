import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Home, Plus, Edit, Trash2, Palette } from "lucide-react";

interface TreatmentRoom {
  id: number;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

const PRESET_COLORS = [
  "#3f51b5", "#f44336", "#ff9800", "#4caf50", "#9c27b0", 
  "#00bcd4", "#795548", "#607d8b", "#e91e63", "#ffc107"
];

export default function TreatmentRoomsPage() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<TreatmentRoom | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<TreatmentRoom | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3f51b5",
    isActive: true
  });

  // Query per recuperare stanze
  const { data: rooms = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/treatment-rooms'],
  });

  // Mutation per creare stanza
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/treatment-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Errore creazione stanza');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatment-rooms'] });
      toast({ title: "Stanza creata con successo" });
      resetForm();
      setShowAddDialog(false);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile creare la stanza", variant: "destructive" });
    }
  });

  // Mutation per aggiornare stanza
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/treatment-rooms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Errore aggiornamento stanza');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatment-rooms'] });
      toast({ title: "Stanza aggiornata con successo" });
      resetForm();
      setEditingRoom(null);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare la stanza", variant: "destructive" });
    }
  });

  // Mutation per eliminare stanza
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/treatment-rooms/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Errore eliminazione stanza');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/treatment-rooms'] });
      toast({ title: "Stanza eliminata con successo" });
      setDeletingRoom(null);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare la stanza", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3f51b5",
      isActive: true
    });
  };

  const handleEdit = (room: TreatmentRoom) => {
    setFormData({
      name: room.name,
      description: room.description || "",
      color: room.color,
      isActive: room.isActive
    });
    setEditingRoom(room);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({ title: "Errore", description: "Il nome della stanza è obbligatorio", variant: "destructive" });
      return;
    }

    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Caricamento stanze...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Stanze/Cabine</h1>
          <p className="text-muted-foreground mt-1">
            Configura le stanze e cabine di trattamento del tuo studio
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Stanza
        </Button>
      </div>

      {/* Lista stanze */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room: TreatmentRoom) => (
          <Card key={room.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-gray-200" 
                    style={{ backgroundColor: room.color }}
                  />
                  <CardTitle className="text-lg">
                    {room.name}
                  </CardTitle>
                </div>
                <Badge variant={room.isActive ? "default" : "secondary"}>
                  {room.isActive ? "Attiva" : "Inattiva"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {room.description && (
                  <p className="text-sm text-muted-foreground">
                    {room.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Palette className="h-4 w-4" />
                  <span>Colore calendario</span>
                  <div 
                    className="w-4 h-4 rounded border" 
                    style={{ backgroundColor: room.color }}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(room)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingRoom(room)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rooms.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Home className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna stanza configurata</h3>
            <p className="text-gray-500 mb-4">Aggiungi le prime stanze o cabine di trattamento</p>
            <Button 
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Stanza
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog Aggiungi/Modifica */}
      <Dialog open={showAddDialog || !!editingRoom} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingRoom(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Modifica Stanza" : "Aggiungi Stanza"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Stanza *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="es. Cabina 1, Studio Principale, Sala Massaggi..."
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrizione opzionale della stanza..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="color">Colore Calendario</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-gray-800' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="mt-2 h-12"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="isActive">Stanza attiva</Label>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false);
                setEditingRoom(null);
                resetForm();
              }}>
                Annulla
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Conferma Eliminazione */}
      <AlertDialog open={!!deletingRoom} onOpenChange={() => setDeletingRoom(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la stanza "{deletingRoom?.name}"?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRoom && deleteMutation.mutate(deletingRoom.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}