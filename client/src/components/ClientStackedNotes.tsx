import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Plus, Clock, ChevronLeft, ChevronRight, CalendarDays, Image as ImageIcon, X } from 'lucide-react';
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
  imagePaths?: string[];
  createdAt: string;
  updatedAt?: string;
};

type ClientStackedNotesProps = {
  clientId: number;
  category: string;
  label: string;
};

export default function ClientStackedNotes({ clientId, category, label }: ClientStackedNotesProps) {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Stato principale
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Stato per il titolo della sezione personalizzato
  const [customLabel, setCustomLabel] = useState<string>(() => {
    const saved = localStorage.getItem(`section-label-${category}-${clientId}`);
    return saved || label;
  });
  const [editingLabel, setEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState(customLabel);
  
  // Stato per l'animazione e navigazione delle note
  const [activeNoteIndex, setActiveNoteIndex] = useState(0);
  const [animatingToNext, setAnimatingToNext] = useState(false);
  const [animatingToPrev, setAnimatingToPrev] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Query per ottenere TUTTE le note del cliente (condivisa tra tutte le sezioni)
  const { data: allNotes, isLoading } = useQuery<ClientNote[]>({
    queryKey: ['/api/client-notes', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/client-notes/${clientId}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minuti - evita refetch inutili
  });
  
  // Filtra le note per categoria (client-side)
  const notes = allNotes?.filter((note: ClientNote) => note.category === category);
  
  // Mutations per le operazioni CRUD
  const createNoteMutation = useMutation({
    mutationFn: async (note: { clientId: number; title: string; content: string; category: string }) => {
      const res = await apiRequest('POST', '/api/client-notes', note);
      return res.json();
    },
    onSuccess: () => {
      // Invalida tutte le query delle note per questo cliente (tutte le categorie)
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes'] });
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
      // Invalida tutte le query delle note per questo cliente (tutte le categorie)
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes'] });
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
      // Invalida tutte le query delle note per questo cliente (tutte le categorie)
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes'] });
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
      // Invalida tutte le query delle note per questo cliente (tutte le categorie)
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes'] });
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
  
  // Mutations per immagini
  const uploadImageMutation = useMutation({
    mutationFn: async ({ noteId, file }: { noteId: number; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/client-notes/${noteId}/upload-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) throw new Error(t('clientNotes.uploadFailed'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes'] });
      toast({ title: t('clientNotes.photoUploadedShort') });
    },
    onError: () => {
      toast({ title: t('clientNotes.errorPhotoUpload'), variant: 'destructive' });
    }
  });
  
  const deleteImageMutation = useMutation({
    mutationFn: async ({ noteId, imageIndex }: { noteId: number; imageIndex: number }) => {
      await apiRequest('DELETE', `/api/client-notes/${noteId}/delete-image/${imageIndex}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes'] });
      toast({ title: t('clientNotes.photoDeleted') });
    },
    onError: () => {
      toast({ title: t('clientNotes.errorPhotoDelete'), variant: 'destructive' });
    }
  });
  
  // Gestione form
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
      // Se stiamo eliminando la nota attiva, torniamo alla nota precedente
      if (sortedNotes && sortedNotes.length > 1 && activeNoteIndex < sortedNotes.length && sortedNotes[activeNoteIndex]?.id === id) {
        if (activeNoteIndex > 0) {
          setActiveNoteIndex(activeNoteIndex - 1);
        } else {
          setActiveNoteIndex(0);
        }
      }
    }
  };
  
  const handleDuplicateNote = (note: ClientNote) => {
    duplicateNoteMutation.mutate(note);
  };
  
  // Funzioni di navigazione
  const goToNextNote = () => {
    if (!sortedNotes || !hasNotes || activeNoteIndex >= sortedNotes.length - 1) return;
    
    setAnimatingToNext(true);
    setTimeout(() => {
      // Verifico che l'indice sia ancora valido
      if (activeNoteIndex < sortedNotes.length - 1) {
        setActiveNoteIndex(activeNoteIndex + 1);
      }
      setAnimatingToNext(false);
    }, 300);
  };
  
  const goToPrevNote = () => {
    if (!sortedNotes || !hasNotes || activeNoteIndex <= 0) return;
    
    setAnimatingToPrev(true);
    setTimeout(() => {
      // Verifico che l'indice sia ancora valido
      if (activeNoteIndex > 0) {
        setActiveNoteIndex(activeNoteIndex - 1);
      }
      setAnimatingToPrev(false);
    }, 300);
  };
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Utility
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy, HH:mm", { locale: getDateLocale(i18n.language) });
    } catch (e) {
      return dateString;
    }
  };
  
  // Ordina le note dalla più recente alla più vecchia
  const sortedNotes = notes?.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  // Verifica se ci sono note
  const hasNotes = sortedNotes && sortedNotes.length > 0;
  
  // Resetta l'indice attivo se è fuori dai limiti
  useEffect(() => {
    if (hasNotes && activeNoteIndex >= sortedNotes.length) {
      setActiveNoteIndex(0);
    }
  }, [hasNotes, sortedNotes, activeNoteIndex]);
  
  // Ottieni la nota attiva
  const activeNote = hasNotes && activeNoteIndex < sortedNotes.length ? sortedNotes[activeNoteIndex] : null;

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
        <div className="flex space-x-2">
          {/* Navigazione tra le note */}
          {hasNotes && sortedNotes.length > 1 && (
            <div className="flex items-center space-x-1 mr-2">
              <Button 
                onClick={goToPrevNote} 
                variant="outline" 
                size="icon"
                disabled={activeNoteIndex === 0}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {activeNoteIndex + 1}/{sortedNotes.length}
              </span>
              <Button 
                onClick={goToNextNote} 
                variant="outline" 
                size="icon"
                disabled={activeNoteIndex === sortedNotes.length - 1}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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
            disabled={!hasNotes}
            title={hasNotes ? t('clientNotes.duplicateLast') : t('clientNotes.noNoteToDuplicate')}
          >
            <Plus className="h-4 w-4" />
            {t('clientNotes.addButton')}
          </Button>
        </div>
      </div>
      
      {/* Dialog per creare/modificare le note */}
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
      
      {/* Container delle note impilate */}
      <div 
        ref={containerRef}
        className={`relative h-[350px] ${sortedNotes && sortedNotes.length > 3 ? 'overflow-y-auto' : 'overflow-hidden'}`}
        style={{
          maxHeight: sortedNotes && sortedNotes.length > 3 ? '600px' : '350px'
        }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : !hasNotes ? (
          <div className="border rounded-md bg-background h-full p-4 relative">
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
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              {t('clientNotes.emptyStateAdd')}
            </div>
          </div>
        ) : (
          /* Note impilate */
          sortedNotes && sortedNotes.map((note, index) => {
            // Calcola la posizione di ogni nota
            const isActive = index === activeNoteIndex;
            const isPrevious = index < activeNoteIndex;
            const isNext = index > activeNoteIndex;
            
            // Calcola la traslazione per l'effetto di sovrapposizione
            let translateY = isActive ? 0 : (isPrevious ? (-index * 5) : (index * 5));
            let translateX = isActive ? 0 : (isPrevious ? (-index * 20) : (index * 20));
            let zIndex = sortedNotes.length - Math.abs(activeNoteIndex - index);
            let opacity = isActive ? 1 : (Math.max(0.5, 1 - (Math.abs(activeNoteIndex - index) * 0.2)));
            let scale = isActive ? 1 : (Math.max(0.85, 1 - (Math.abs(activeNoteIndex - index) * 0.05)));
            
            // Modifica i valori di trasformazione durante l'animazione
            if (animatingToNext && index === activeNoteIndex + 1) {
              translateY = 0;
              translateX = 0;
              zIndex = sortedNotes.length + 1;
              opacity = 1;
              scale = 1;
            } else if (animatingToPrev && index === activeNoteIndex - 1) {
              translateY = 0;
              translateX = 0;
              zIndex = sortedNotes.length + 1;
              opacity = 1;
              scale = 1;
            }
            
            return (
              <div
                key={note.id}
                onClick={() => {
                  if (!isActive) {
                    if (isPrevious) {
                      goToPrevNote();
                    } else if (isNext) {
                      goToNextNote();
                    }
                  }
                }}
                className={`absolute top-0 left-0 w-full h-full border rounded-md bg-background/95 p-4 
                          shadow-md cursor-pointer transition-all duration-300 ease-in-out
                          ${isActive ? 'shadow-lg' : 'shadow'}
                          ${isExpanded && isActive ? 'hover:shadow-xl' : ''}
                          ${isActive ? '' : 'hover:brightness-105'}`}
                style={{
                  transform: `translateY(${translateY}px) translateX(${translateX}px) scale(${scale})`,
                  opacity,
                  zIndex,
                  transitionDuration: '0.3s',
                }}
              >
                {/* Contenuto della nota */}
                <div className="relative h-full">
                  {/* Data e azioni */}
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3 mr-1" />
                      {formatDate(note.createdAt)}
                    </div>
                    
                    <div className="flex space-x-1">
                      {/* Pulsante Foto */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById(`upload-${note.id}`)?.click();
                        }}
                        className="h-7 w-7 text-blue-600"
                        title={t('clientNotes.addPhoto')}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditNote(note);
                        }}
                        className="h-7 w-7"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="h-7 w-7 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {/* Input file nascosto */}
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`upload-${note.id}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadImageMutation.mutate({ noteId: note.id, file });
                            e.target.value = '';
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  
                  {/* Titolo */}
                  {note.title && (
                    <h4 className="font-medium mb-2 text-primary">{note.title}</h4>
                  )}
                  
                  {/* Contenuto */}
                  <div className="overflow-auto max-h-[250px]">
                    <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                    
                    {/* Foto allegate */}
                    {note.imagePaths && note.imagePaths.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {note.imagePaths.map((imagePath, idx) => (
                          <div key={idx} className="relative group">
                            <img 
                              src={imagePath.startsWith('/') ? imagePath : `/${imagePath}`}
                              alt={t('clientNotes.photoAlt', { n: idx + 1 })}
                              className="w-full h-32 object-contain rounded border bg-gray-50"
                            />
                            {isActive && (
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
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Indicazione di scorrimento */}
                  {isActive && index < sortedNotes.length - 1 && (
                    <div 
                      className="absolute bottom-0 right-2 text-xs text-muted-foreground opacity-50 animate-pulse"
                    >
                      {t('clientNotes.scrollNext')}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}