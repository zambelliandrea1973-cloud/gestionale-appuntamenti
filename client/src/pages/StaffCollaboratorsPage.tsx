import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Edit, Trash2, Phone, Mail, Award } from "lucide-react";

interface Collaborator {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  specialization?: string;
  isActive: boolean;
  createdAt: string;
}

export default function StaffCollaboratorsPage() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [deletingCollaborator, setDeletingCollaborator] = useState<Collaborator | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialization: "",
    isActive: true
  });

  // Query per recuperare collaboratori
  const { data: collaborators = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/collaborators'],
  });

  // Mutation per creare collaboratore
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Errore creazione collaboratore');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaborators'] });
      toast({ title: "Collaboratore creato con successo" });
      resetForm();
      setShowAddDialog(false);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile creare il collaboratore", variant: "destructive" });
    }
  });

  // Mutation per aggiornare collaboratore
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/collaborators/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Errore aggiornamento collaboratore');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaborators'] });
      toast({ title: "Collaboratore aggiornato con successo" });
      resetForm();
      setEditingCollaborator(null);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare il collaboratore", variant: "destructive" });
    }
  });

  // Mutation per eliminare collaboratore
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/collaborators/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Errore eliminazione collaboratore');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaborators'] });
      toast({ title: "Collaboratore eliminato con successo" });
      setDeletingCollaborator(null);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare il collaboratore", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      specialization: "",
      isActive: true
    });
  };

  const handleEdit = (collaborator: Collaborator) => {
    setFormData({
      firstName: collaborator.firstName,
      lastName: collaborator.lastName,
      email: collaborator.email || "",
      phone: collaborator.phone || "",
      specialization: collaborator.specialization || "",
      isActive: collaborator.isActive
    });
    setEditingCollaborator(collaborator);
  };

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName) {
      toast({ title: "Errore", description: "Nome e cognome sono obbligatori", variant: "destructive" });
      return;
    }

    if (editingCollaborator) {
      updateMutation.mutate({ id: editingCollaborator.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Caricamento collaboratori...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Collaboratori</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci i collaboratori dello studio e le loro specializzazioni
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Aggiungi Collaboratore
        </Button>
      </div>

      {/* Lista collaboratori */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collaborators.map((collaborator: Collaborator) => (
          <Card key={collaborator.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {collaborator.firstName} {collaborator.lastName}
                </CardTitle>
                <Badge variant={collaborator.isActive ? "default" : "secondary"}>
                  {collaborator.isActive ? "Attivo" : "Inattivo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {collaborator.specialization && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Award className="h-4 w-4 mr-2" />
                    {collaborator.specialization}
                  </div>
                )}
                {collaborator.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    {collaborator.email}
                  </div>
                )}
                {collaborator.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    {collaborator.phone}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(collaborator)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingCollaborator(collaborator)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {collaborators.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun collaboratore</h3>
            <p className="text-gray-500 mb-4">Inizia aggiungendo il primo collaboratore dello studio</p>
            <Button 
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Aggiungi Collaboratore
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog Aggiungi/Modifica */}
      <Dialog open={showAddDialog || !!editingCollaborator} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingCollaborator(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCollaborator ? "Modifica Collaboratore" : "Aggiungi Collaboratore"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Nome"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Cognome *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Cognome"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="specialization">Specializzazione</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                placeholder="es. Fisioterapista, Ostetrica, Massaggiatore..."
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@esempio.com"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="es. +39 123 456 7890"
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
              <Label htmlFor="isActive">Attivo</Label>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false);
                setEditingCollaborator(null);
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
      <AlertDialog open={!!deletingCollaborator} onOpenChange={() => setDeletingCollaborator(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il collaboratore {deletingCollaborator?.firstName} {deletingCollaborator?.lastName}?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCollaborator && deleteMutation.mutate(deletingCollaborator.id)}
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