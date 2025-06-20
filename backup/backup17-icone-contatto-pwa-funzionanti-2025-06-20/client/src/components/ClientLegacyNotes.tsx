import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Plus, Clock } from 'lucide-react';
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

type ClientLegacyNotesProps = {
  clientId: number;
  category: string;
  label: string;
};

export default function ClientLegacyNotes({ clientId, category, label }: ClientLegacyNotesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const { data: notes, isLoading } = useQuery<ClientNote[]>({
    queryKey: ['/api/client-notes', clientId, category],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/client-notes/${clientId}`);
      const allNotes = await res.json();
      // Filtra le note per categoria
      return allNotes.filter((note: ClientNote) => note.category === category);
    },
  });
  
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
    }
  };
  
  const handleDuplicateNote = (note: ClientNote) => {
    duplicateNoteMutation.mutate(note);
  };
  
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

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">{label}</h3>
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
      
      {isLoading ? (
        <div className="flex justify-center my-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedNotes && sortedNotes.length > 0 ? (
            sortedNotes.map((note) => (
              <div key={note.id} className="border p-4 rounded-md bg-background relative group">
                <div className="absolute right-2 top-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDuplicateNote(note)}
                    className="h-7 w-7"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="mb-1 flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(note.createdAt)}
                </div>
                
                {note.title && (
                  <h4 className="font-medium mb-1">{note.title}</h4>
                )}
                
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
              </div>
            ))
          ) : (
            <div className="border p-4 rounded-md bg-background min-h-24 text-center text-muted-foreground">
              Nessuna nota disponibile. Clicca su "Aggiungi" per crearne una.
            </div>
          )}
        </div>
      )}
    </div>
  );
}