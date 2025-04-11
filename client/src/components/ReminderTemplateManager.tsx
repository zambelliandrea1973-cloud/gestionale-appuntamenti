import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { ReminderTemplate, Service } from '../types/api';

export default function ReminderTemplateManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    template: string;
    type: string;
    serviceId: number | null;
    isDefault: boolean;
  }>({
    name: '',
    template: '',
    type: 'sms',
    serviceId: null,
    isDefault: false,
  });

  // Fetch reminder templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery<ReminderTemplate[]>({
    queryKey: ['/api/reminder-templates'],
    queryFn: ({ queryKey }) => fetch(queryKey[0]).then(res => res.json()),
  });

  // Fetch services
  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: ({ queryKey }) => fetch(queryKey[0]).then(res => res.json()),
  });

  // Create template
  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<ReminderTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/reminder-templates', template);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminder-templates'] });
      setIsFormOpen(false);
      resetForm();
      toast({
        title: t('settings.reminderTemplates.createdSuccess'),
        description: t('settings.reminderTemplates.createdSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('settings.reminderTemplates.createdError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update template
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: ReminderTemplate) => {
      const response = await apiRequest('PUT', `/api/reminder-templates/${template.id}`, template);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminder-templates'] });
      setIsFormOpen(false);
      resetForm();
      toast({
        title: t('settings.reminderTemplates.updatedSuccess'),
        description: t('settings.reminderTemplates.updatedSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('settings.reminderTemplates.updatedError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/reminder-templates/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminder-templates'] });
      toast({
        title: t('settings.reminderTemplates.deletedSuccess'),
        description: t('settings.reminderTemplates.deletedSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('settings.reminderTemplates.deletedError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      template: '',
      type: 'sms',
      serviceId: null,
      isDefault: false,
    });
    setEditingTemplate(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (template: ReminderTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template: template.template,
      type: template.type || 'sms',
      serviceId: template.serviceId || null,
      isDefault: template.isDefault || false,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTemplate) {
      updateTemplateMutation.mutate({
        ...editingTemplate,
        ...formData,
      } as ReminderTemplate);
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('settings.reminderTemplates.confirmDelete'))) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const isLoading = isLoadingTemplates || isLoadingServices;
  const isPending = createTemplateMutation.isPending || updateTemplateMutation.isPending || deleteTemplateMutation.isPending;

  // Variables suggestions for template text
  const variableSuggestions = [
    '{clientName}', 
    '{appointmentDate}', 
    '{appointmentTime}', 
    '{serviceName}'
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{t('settings.reminderTemplates.title', 'Modelli di Promemoria')}</h3>
        <Button onClick={openCreateForm} className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          {t('settings.reminderTemplates.addNew', 'Nuovo Modello')}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {t('settings.reminderTemplates.description', 'Personalizza i messaggi di promemoria inviati ai clienti per gli appuntamenti. Puoi creare modelli generici o specifici per ciascun servizio.')}
      </p>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates && templates.length > 0 ? (
          templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{template.name}</h4>
                      {template.isDefault && (
                        <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                          {t('settings.reminderTemplates.default', 'Predefinito')}
                        </span>
                      )}
                      {template.type && (
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                          {template.type.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {template.serviceId && services?.find(s => s.id === template.serviceId) && (
                      <div className="text-sm text-muted-foreground mb-2">
                        {t('settings.reminderTemplates.forService', 'Per il servizio')}: {services.find(s => s.id === template.serviceId)?.name}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-line border-l-2 border-gray-200 pl-3 py-1 mt-2">
                      {template.template}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditForm(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">
              {t('settings.reminderTemplates.noTemplates', 'Nessun modello di promemoria definito')}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={openCreateForm}
            >
              {t('settings.reminderTemplates.createFirst', 'Crea il primo modello')}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate 
                ? t('settings.reminderTemplates.editTitle', 'Modifica Modello di Promemoria') 
                : t('settings.reminderTemplates.createTitle', 'Nuovo Modello di Promemoria')
              }
            </DialogTitle>
            <DialogDescription>
              {t('settings.reminderTemplates.formDescription', 'Personalizza il messaggio di promemoria inviato ai clienti per gli appuntamenti.')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('common.name')}</Label>
              <Input 
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('settings.reminderTemplates.namePlaceholder', 'Es. Promemoria standard')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t('settings.reminderTemplates.type', 'Tipo di Promemoria')}</Label>
              <Select 
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.reminderTemplates.selectType', 'Seleziona tipo')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">{t('settings.reminderTemplates.service', 'Servizio (opzionale)')}</Label>
              <Select 
                value={formData.serviceId?.toString() || ""}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  serviceId: value ? parseInt(value) : null 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.reminderTemplates.selectService', 'Tutti i servizi')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('settings.reminderTemplates.allServices', 'Tutti i servizi')}</SelectItem>
                  {services?.map(service => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('settings.reminderTemplates.serviceHelp', 'Se selezionato, questo modello verrà usato solo per gli appuntamenti con questo servizio.')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="template">{t('settings.reminderTemplates.messageTemplate', 'Testo del Messaggio')}</Label>
                <div className="text-xs text-muted-foreground">
                  {t('settings.reminderTemplates.variables', 'Variabili disponibili')}:
                  {variableSuggestions.map((variable, index) => (
                    <span 
                      key={index} 
                      className="ml-1 cursor-pointer text-primary"
                      onClick={() => {
                        const textarea = document.getElementById('template') as HTMLTextAreaElement;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = textarea.value;
                          const newText = text.substring(0, start) + variable + text.substring(end);
                          setFormData(prev => ({ ...prev, template: newText }));
                          // Set cursor position after inserted variable
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + variable.length, start + variable.length);
                          }, 0);
                        }
                      }}
                    >
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
              <Textarea 
                id="template"
                value={formData.template}
                onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                placeholder={t('settings.reminderTemplates.templatePlaceholder', 'Es. Gentile {clientName}, questo è un promemoria per il tuo appuntamento del {appointmentDate} alle {appointmentTime}.')}
                required
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.reminderTemplates.templateHelp', 'Usa le variabili per includere informazioni specifiche dell\'appuntamento.')}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
              />
              <Label htmlFor="isDefault">
                {t('settings.reminderTemplates.setAsDefault', 'Imposta come modello predefinito')}
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTemplate 
                  ? t('common.save') 
                  : t('common.create')
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}