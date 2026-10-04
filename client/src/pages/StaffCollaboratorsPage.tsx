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
import { usePrivateAppointments } from "@/components/private-appointments/PrivateAppointmentsProvider";

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
  const privateAppointments = usePrivateAppointments();
  const { toast } = useToast();
  const { hasCapability, getUpgradeMessage } = useCapabilities();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [deletingCollaborator, setDeletingCollaborator] = useState<Collaborator | null>(null);
  const [needsPrivatePassword, setNeedsPrivatePassword] = useState(false);
  const [privatePassword, setPrivatePassword] = useState("");
  const [privatePasswordConfirm, setPrivatePasswordConfirm] = useState("");
  const [pendingCollaborator, setPendingCollaborator] = useState<any>(null);
  const [privatePasswordError, setPrivatePasswordError] = useState("");
  const [preparingPrivateSpace, setPreparingPrivateSpace] = useState(false);
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
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 428 && body?.code === 'PRIVATE_PASSWORD_REQUIRED') {
        setPendingCollaborator(data);
        setNeedsPrivatePassword(true);
        setPrivatePasswordError("");
        return { needsPrivatePassword: true };
      }
      if (!response.ok) throw new Error(body?.message || 'Create collaborator failed');
      return body;
    },
    onSuccess: (result) => {
      if (result?.needsPrivatePassword) return;
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
    setNeedsPrivatePassword(false);
    setPrivatePassword("");
    setPrivatePasswordConfirm("");
    setPendingCollaborator(null);
    setPrivatePasswordError("");
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
      setNeedsPrivatePassword(false);
      setPrivatePasswordError("");
      createMutation.mutate(formData);
    }
  };

  const preparePrivateSpaceAndRetry = async () => {
    if (preparingPrivateSpace) return;
    setPrivatePasswordError("");
    if (privatePassword.length < 10 || privatePassword.length > 128) {
      setPrivatePasswordError("La password deve contenere da 10 a 128 caratteri.");
      return;
    }
    if (privatePassword !== privatePasswordConfirm) {
      setPrivatePasswordError("Le password non coincidono.");
      return;
    }
    if (!pendingCollaborator) {
      setPrivatePasswordError("I dati del collaboratore non sono disponibili. Riprova l’inserimento.");
      return;
    }
    setPreparingPrivateSpace(true);
    try {
      const response = await fetch('/api/private-appointments/prepare-team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: privatePassword }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Non è stato possibile proteggere lo spazio privato.');
      const originalPayload = pendingCollaborator;
      setPrivatePassword("");
      setPrivatePasswordConfirm("");
      setNeedsPrivatePassword(false);
      setPrivatePasswordError("");
      await privateAppointments.lock();
      await privateAppointments.refreshProfiles();
      createMutation.mutate(originalPayload);
    } catch (error) {
      setPrivatePasswordError((error as Error).message || 'Non è stato possibile proteggere lo spazio privato.');
    } finally {
      setPreparingPrivateSpace(false);
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

            {needsPrivatePassword && !editingCollaborator && (
              <section className="space-y-3 rounded-xl border border-[#dce3d8] bg-[#f5f7f2] p-4" aria-labelledby="private-password-title">
                <div>
                  <h3 id="private-password-title" className="m-0 text-sm font-bold text-[#43543f]">Proteggi il tuo spazio personale</h3>
                  <p className="mb-0 mt-1 text-xs leading-relaxed text-[#6f7c71]">
                    Prima di aggiungere un collega, imposta una password personale. Ti verrà chiesta solo per attivare la privacy multi-professionista; il collaboratore sarà aggiunto subito dopo.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="private-space-password">Nuova password (10–128 caratteri)</Label>
                    <Input id="private-space-password" type="password" minLength={10} maxLength={128} autoComplete="new-password" value={privatePassword} onChange={event=>setPrivatePassword(event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="private-space-password-confirm">Conferma password</Label>
                    <Input id="private-space-password-confirm" type="password" maxLength={128} autoComplete="new-password" value={privatePasswordConfirm} onChange={event=>setPrivatePasswordConfirm(event.target.value)} />
                  </div>
                </div>
                <p className="m-0 text-[11px] text-[#7a867d]">Conservala in un luogo sicuro: non è previsto un ripristino senza verifica.</p>
                {privatePasswordError && <p className="m-0 text-xs font-medium text-red-700" role="alert">{privatePasswordError}</p>}
                <div className="flex justify-end">
                  <Button type="button" onClick={()=>void preparePrivateSpaceAndRetry()} disabled={createMutation.isPending||preparingPrivateSpace}>
                    {preparingPrivateSpace?'Protezione in corso…':'Proteggi e aggiungi collega'}
                  </Button>
                </div>
              </section>
            )}

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
                disabled={createMutation.isPending || updateMutation.isPending || needsPrivatePassword}
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
