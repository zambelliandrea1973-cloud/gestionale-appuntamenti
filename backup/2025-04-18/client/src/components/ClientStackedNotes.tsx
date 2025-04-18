import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Plus, Clock, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
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
};

type ClientStackedNotesProps = {
  clientId: number;
  category: string;
  label: string;
};

export default function ClientStackedNotes({ clientId, category, label }: ClientStackedNotesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Stato principale
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Stato per l'animazione e navigazione delle note
  const [activeNoteIndex, setActiveNoteIndex] = useState(0);
  const [animatingToNext, setAnimatingToNext] = useState(false);
  const [animatingToPrev, setAnimatingToPrev] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Query per ottenere le note
  const { data: notes, isLoading } = useQuery<ClientNote[]>({
    queryKey: ['/api/client-notes', clientId, category],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/client-notes/${clientId}`);
      const allNotes = await res.json();
      // Filtra le note per categoria
      return allNotes.filter((note: ClientNote) => note.category === category);
    },
  });
  
  // Mutations per le operazioni CRUD
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
        title: 'Nota creata', 
        description: 'La nota è stata salvata con successo' 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Errore', 
        description: `Impossibile creare la nota: ${error.message}`,
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
        title: 'Nota aggiornata', 
        description: 'La nota è stata aggiornata con successo' 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Errore', 
        description: `Impossibile aggiornare la nota: ${error.message}`,
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
        title: 'Nota eliminata', 
        description: 'La nota è stata eliminata con successo' 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Errore', 
        description: `Impossibile eliminare la nota: ${error.message}`,
        variant: 'destructive'
      });
    }
  });
  
  const duplicateNoteMutation = useMutation({
    mutationFn: async (note: ClientNote) => {
      const duplicateNote = {
        clientId: note.clientId,
        title: `${note.title} (copia)`,
        content: note.content,
        category: note.category
      };
      const res = await apiRequest('POST', '/api/client-notes', duplicateNote);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-notes', clientId] });
      toast({ 
        title: 'Nota duplicata', 
        description: 'La nota è stata duplicata con successo' 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Errore', 
        description: `Impossibile duplicare la nota: ${error.message}`,
        variant: 'destructive'
      });
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
        title: 'Dati mancanti', 
        description: 'Inserisci titolo e contenuto per la nota',
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
    if (confirm('Sei sicuro di voler eliminare questa nota?')) {
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
      return format(date, "d MMMM yyyy, HH:mm", { locale: it });
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

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">{label}</h3>
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
            onClick={handleOpenDialog} 
            variant="outline" 
            size="sm"
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Aggiungi
          </Button>
        </div>
      </div>
      
      {/* Dialog per creare/modificare le note */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Modifica nota' : 'Crea nuova nota'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3">
              <div>
                <label htmlFor="title" className="text-sm font-medium">
                  Titolo
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titolo della nota"
                />
              </div>
              
              <div>
                <label htmlFor="content" className="text-sm font-medium">
                  Contenuto
                </label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Contenuto della nota"
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
                Annulla
              </Button>
              <Button 
                type="submit"
                disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
              >
                {createNoteMutation.isPending || updateNoteMutation.isPending ? (
                  'Salvataggio...'
                ) : (
                  editingNote ? 'Aggiorna' : 'Salva'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Container delle note impilate */}
      <div 
        ref={containerRef}
        className={`relative h-[350px] overflow-hidden`}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : !hasNotes ? (
          <div className="border rounded-md bg-background h-full flex items-center justify-center text-center text-muted-foreground p-4">
            Nessuna nota disponibile. Clicca su "Aggiungi" per crearne una.
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
                    
                    {isActive && (
                      <div className="flex space-x-1">
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateNote(note);
                          }}
                          className="h-7 w-7"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Titolo */}
                  {note.title && (
                    <h4 className="font-medium mb-2 text-primary">{note.title}</h4>
                  )}
                  
                  {/* Contenuto */}
                  <div className="overflow-auto max-h-[250px]">
                    <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                  </div>
                  
                  {/* Indicazione di scorrimento */}
                  {isActive && index < sortedNotes.length - 1 && (
                    <div 
                      className="absolute bottom-0 right-2 text-xs text-muted-foreground opacity-50 animate-pulse"
                    >
                      Scorrere per visualizzare le note successive →
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