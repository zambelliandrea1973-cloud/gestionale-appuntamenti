import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Plus, Clock, ImageIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/utils/date';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type ClientNote = {
  id: number;
  clientId: number;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt?: string;
  imagePaths?: string[];
};

type ClientLegacyNotesProps = {
  clientId: number;
  category: string;
  label: string;
};

export default function ClientLegacyNotes({ clientId, category, label }: ClientLegacyNotesProps) {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [customLabel, setCustomLabel] = useState<string>(() => {
    const saved = localStorage.getItem(`section-label-${category}-${clientId}`);
    return saved || label;
  });
  const [editingLabel, setEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState(customLabel);

  const { data: allNotes, isLoading } = useQuery<ClientNote[]>({
    queryKey: ['/api/client-notes', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/client-notes/${clientId}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const notes = allNotes?.filter((note: ClientNote) => note.category === category);

  const createNoteMutation = useMutation({
    mutationFn: async (note: { clientId: number; title: string; content: string; category: string }) => {
      const res = await apiRequest('POST', '/api/client-notes', note);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      setOpen(false);
      resetForm();
      toast({
        title: t('clientNotes.noteCreated'),
        description: t('clientNotes.noteCreatedDesc')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('clientNotes.error'),
        description: t('clientNotes.errorCreate', { message: error.message }),
        variant: 'destructive'
      });
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, ...note }: { id: number; title: string; content: string; category: string }) => {
      const res = await apiRequest('PUT', `/api/client-notes/${id}`, note);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      setOpen(false);
      resetForm();
      toast({
        title: t('clientNotes.noteUpdated'),
        description: t('clientNotes.noteUpdatedDesc')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('clientNotes.error'),
        description: t('clientNotes.errorUpdate', { message: error.message }),
        variant: 'destructive'
      });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/client-notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      toast({
        title: t('clientNotes.noteDeleted'),
        description: t('clientNotes.noteDeletedDesc')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('clientNotes.error'),
        description: t('clientNotes.errorDelete', { message: error.message }),
        variant: 'destructive'
      });
    }
  });

  const duplicateNoteMutation = useMutation({
    mutationFn: async (note: ClientNote) => {
      const duplicateNote = {
        clientId: note.clientId,
        title: `${note.title} ${t('clientNotes.copySuffix')}`,
        content: note.content,
        category: note.category
      };
      const res = await apiRequest('POST', '/api/client-notes', duplicateNote);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      toast({
        title: t('clientNotes.noteDuplicated'),
        description: t('clientNotes.noteDuplicatedDesc')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('clientNotes.error'),
        description: t('clientNotes.errorDuplicate', { message: error.message }),
        variant: 'destructive'
      });
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ noteId, file }: { noteId: number; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`/api/client-notes/${noteId}/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || t('clientNotes.uploadGenericError'));
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      toast({
        title: t('clientNotes.photoUploaded'),
        description: t('clientNotes.photoUploadedDesc')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('clientNotes.error'),
        description: t('clientNotes.errorPhotoUploadDesc', { message: error.message }),
        variant: 'destructive'
      });
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({ noteId, imageIndex }: { noteId: number; imageIndex: number }) => {
      const res = await apiRequest('DELETE', `/api/client-notes/${noteId}/delete-image/${imageIndex}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      toast({
        title: t('clientNotes.photoDeleted'),
        description: t('clientNotes.photoDeletedDesc')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('clientNotes.error'),
        description: t('clientNotes.errorPhotoDeleteDesc', { message: error.message }),
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEditingNote(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setOpen(true);
  };

  const handleEditNote = (note: ClientNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({
        title: t('clientNotes.missingData'),
        description: t('clientNotes.missingDataDesc'),
        variant: 'destructive'
      });
      return;
    }

    if (editingNote) {
      updateNoteMutation.mutate({
        id: editingNote.id,
        title,
        content,
        category
      });
    } else {
      createNoteMutation.mutate({
        clientId,
        title,
        content,
        category
      });
    }
  };

  const handleDeleteNote = (id: number) => {
    if (confirm(t('clientNotes.confirmDelete'))) {
      deleteNoteMutation.mutate(id);
    }
  };

  const handleDuplicateNote = (note: ClientNote) => {
    duplicateNoteMutation.mutate(note);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy, HH:mm", { locale: getDateLocale(i18n.language) });
    } catch (e) {
      return dateString;
    }
  };

  const sortedNotes = notes?.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleSaveLabel = () => {
    if (tempLabel.trim()) {
      setCustomLabel(tempLabel.trim());
      localStorage.setItem(`section-label-${category}-${clientId}`, tempLabel.trim());
      setEditingLabel(false);
      toast({
        title: t('clientNotes.labelUpdated'),
        description: t('clientNotes.labelUpdatedDesc')
      });
    }
  };

  const handleResetLabel = () => {
    setCustomLabel(label);
    setTempLabel(label);
    localStorage.removeItem(`section-label-${category}-${clientId}`);
    setEditingLabel(false);
    toast({
      title: t('clientNotes.labelReset'),
      description: t('clientNotes.labelResetDesc')
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        {editingLabel ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={tempLabel}
              onChange={(e) => setTempLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveLabel();
                if (e.key === 'Escape') {
                  setTempLabel(customLabel);
                  setEditingLabel(false);
                }
              }}
              className="max-w-xs"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveLabel}>
              {t('clientNotes.save')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              setTempLabel(customLabel);
              setEditingLabel(false);
            }}>
              {t('clientNotes.cancel')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{customLabel}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setTempLabel(customLabel);
                setEditingLabel(true);
              }}
              title={t('clientNotes.editLabel')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {customLabel !== label && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={handleResetLabel}
                title={t('clientNotes.resetLabel')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <Button
          onClick={() => {
            if (sortedNotes && sortedNotes.length > 0) {
              handleDuplicateNote(sortedNotes[0]);
            }
          }}
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={!sortedNotes || sortedNotes.length === 0}
          title={sortedNotes && sortedNotes.length > 0 ? t('clientNotes.duplicateLast') : t('clientNotes.noNoteToDuplicate')}
        >
          <Plus className="h-4 w-4" />
          {t('clientNotes.addButton')}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="min-[1200px]:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? t('clientNotes.editTitle') : t('clientNotes.createTitle')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3">
              <div>
                <label htmlFor="title" className="text-sm font-medium">
                  {t('clientNotes.fieldTitle')}
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('clientNotes.fieldTitlePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="content" className="text-sm font-medium">
                  {t('clientNotes.fieldContent')}
                </label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('clientNotes.fieldContentPlaceholder')}
                  rows={5}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
                disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
              >
                {t('clientNotes.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
              >
                {createNoteMutation.isPending || updateNoteMutation.isPending ? (
                  t('clientNotes.saving')
                ) : (
                  editingNote ? t('clientNotes.update') : t('clientNotes.save')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center my-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className={`space-y-4 ${sortedNotes && sortedNotes.length > 3 ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}>
          {sortedNotes && sortedNotes.length > 0 ? (
            sortedNotes.map((note) => (
              <div key={note.id} className="border p-4 rounded-md bg-background relative group">
                <div className="absolute right-2 top-2 flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => document.getElementById(`upload-legacy-${note.id}`)?.click()}
                    className="h-7 w-7 text-blue-600"
                    title={t('clientNotes.addPhoto')}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditNote(note)}
                    className="h-7 w-7"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteNote(note.id)}
                    className="h-7 w-7 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id={`upload-legacy-${note.id}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadImageMutation.mutate({ noteId: note.id, file });
                        e.target.value = '';
                      }
                    }}
                  />
                </div>

                <div className="mb-1 flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(note.createdAt)}
                </div>

                {note.title && (
                  <h4 className="font-medium mb-1">{note.title}</h4>
                )}

                <p className="whitespace-pre-wrap text-sm">{note.content}</p>

                {note.imagePaths && note.imagePaths.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {note.imagePaths.map((imagePath, idx) => (
                      <div key={idx} className="relative group/img">
                        <img
                          src={imagePath.startsWith('/') ? imagePath : `/${imagePath}`}
                          alt={t('clientNotes.photoAlt', { n: idx + 1 })}
                          className="w-full h-32 object-contain rounded border bg-gray-50"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t('clientNotes.confirmDeletePhoto'))) {
                              deleteImageMutation.mutate({ noteId: note.id, imageIndex: idx });
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="border p-4 rounded-md bg-background min-h-24 relative">
              <div className="absolute right-2 top-2 flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenDialog}
                  className="h-7 w-7"
                  title={t('clientNotes.createDialogTrigger')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive opacity-50 cursor-not-allowed"
                  disabled
                  title={t('clientNotes.noNoteToDelete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-center text-center text-muted-foreground">
                {t('clientNotes.emptyStateAdd')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
