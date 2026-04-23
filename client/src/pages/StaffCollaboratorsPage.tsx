import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Edit, Trash2, Phone, Mail, Award, Lock } from "lucide-react";
import { useCapabilities } from "@/hooks/use-capabilities";
import { UpgradePrompt } from "@/components/UpgradePrompt";

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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { hasCapability, getUpgradeMessage } = useCapabilities();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
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

  const canAccessStaff = hasCapability('staff_rooms');
  const upgradeMessage = getUpgradeMessage('staff_rooms');

  const { data: collaborators = [], isLoading } = useQuery<any>({
    queryKey: ['/api/collaborators'],
  });

  const errorTitle = t('common.error');

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Create collaborator failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaborators'] });
      toast({ title: t('staffCollaborators.toast.created') });
      resetForm();
      setShowAddDialog(false);
    },
    onError: () => {
      toast({ title: errorTitle, description: t('staffCollaborators.errors.create'), variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/collaborators/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Update collaborator failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaborators'] });
      toast({ title: t('staffCollaborators.toast.updated') });
      resetForm();
      setEditingCollaborator(null);
    },
    onError: () => {
      toast({ title: errorTitle, description: t('staffCollaborators.errors.update'), variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/collaborators/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete collaborator failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaborators'] });
      toast({ title: t('staffCollaborators.toast.deleted') });
      setDeletingCollaborator(null);
    },
    onError: () => {
      toast({ title: errorTitle, description: t('staffCollaborators.errors.delete'), variant: "destructive" });
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
      toast({ title: errorTitle, description: t('staffCollaborators.errors.requiredNames'), variant: "destructive" });
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
        <div className="text-center">{t('staffCollaborators.loading')}</div>
      </div>
    );
  }

  if (!canAccessStaff) {
    return (
      <>
        <div className="container mx-auto py-6 space-y-6">
          <Card className="border-2 border-yellow-200 bg-yellow-50/50">
            <CardContent className="text-center py-12">
              <Lock className="h-16 w-16 mx-auto text-yellow-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('staffCollaborators.notAvailable')}</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                <Trans
                  i18nKey="staffCollaborators.notAvailableDesc"
                  components={[<span key="0" className="font-bold text-yellow-700" />]}
                />
              </p>
              <Button
                onClick={() => setShowUpgradePrompt(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                data-testid="button-upgrade-staff"
              >
                {t('staffCollaborators.upgradeBusiness')}
              </Button>
            </CardContent>
          </Card>
        </div>

        <UpgradePrompt
          open={showUpgradePrompt}
          onOpenChange={setShowUpgradePrompt}
          title={upgradeMessage.title}
          description={upgradeMessage.description}
          requiredPlan={upgradeMessage.requiredPlan}
        />
      </>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('staffCollaborators.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('staffCollaborators.subtitle')}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-add-staff"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {t('staffCollaborators.addCollaborator')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collaborators.map((collaborator: Collaborator) => (
          <Card key={collaborator.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {collaborator.firstName} {collaborator.lastName}
                </CardTitle>
                <Badge variant={collaborator.isActive ? "default" : "secondary"}>
                  {collaborator.isActive ? t('staffCollaborators.active') : t('staffCollaborators.inactive')}
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
                <Button variant="outline" size="sm" onClick={() => handleEdit(collaborator)} aria-label={t('common.edit')}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingCollaborator(collaborator)}
                  className="text-red-600 hover:text-red-700"
                  aria-label={t('common.delete')}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('staffCollaborators.empty')}</h3>
            <p className="text-gray-500 mb-4">{t('staffCollaborators.emptyDesc')}</p>
            <Button
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('staffCollaborators.addCollaborator')}
            </Button>
          </CardContent>
        </Card>
      )}

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
              {editingCollaborator
                ? t('staffCollaborators.editCollaborator')
                : t('staffCollaborators.addCollaborator')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">{t('staffCollaborators.firstNameLabel')}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder={t('staffCollaborators.firstName')}
                />
              </div>
              <div>
                <Label htmlFor="lastName">{t('staffCollaborators.lastNameLabel')}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder={t('staffCollaborators.lastName')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="specialization">{t('staffCollaborators.specialization')}</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                placeholder={t('staffCollaborators.specializationPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="email">{t('staffCollaborators.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder={t('staffCollaborators.emailPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="phone">{t('staffCollaborators.phone')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder={t('staffCollaborators.phonePlaceholder')}
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
              <Label htmlFor="isActive">{t('staffCollaborators.activeCheckbox')}</Label>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false);
                setEditingCollaborator(null);
                resetForm();
              }}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('staffCollaborators.saving')
                  : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCollaborator} onOpenChange={() => setDeletingCollaborator(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staffCollaborators.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('staffCollaborators.confirmDeleteDesc', {
                name: deletingCollaborator
                  ? `${deletingCollaborator.firstName} ${deletingCollaborator.lastName}`
                  : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCollaborator && deleteMutation.mutate(deletingCollaborator.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
