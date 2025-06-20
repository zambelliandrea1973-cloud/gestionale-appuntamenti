import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CirclePlus, 
  Edit, 
  Trash, 
  MessageSquare, 
  AlertCircle,
  Stethoscope,
  FileText,
  Meh,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

type ClientNote = {
  id: number;
  clientId: number;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt?: string;
};

type ClientNotesProps = {
  clientId: number;
};

export default function ClientNotes({ clientId }: ClientNotesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  
  const { data: notes, isLoading } = useQuery<ClientNote[]>({
    queryKey: ['/api/client-notes', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/client-notes/${clientId}`);
      return res.json();
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
  
  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('general');
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
    setCategory(note.category);
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
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical':
        return <Stethoscope className="h-4 w-4 text-red-500" />;
      case 'allergies':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'general':
      default:
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy, HH:mm", { locale: it });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Note del cliente</h3>
        <Button onClick={handleOpenDialog} variant="outline" size="sm">
          <CirclePlus className="h-4 w-4 mr-2" />
          Nuova nota
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
              <div className="grid grid-cols-2 gap-3">
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
                  <label htmlFor="category" className="text-sm font-medium">
                    Categoria
                  </label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Generale</SelectItem>
                      <SelectItem value="medical">Medica</SelectItem>
                      <SelectItem value="allergies">Allergie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
        <div className="flex justify-center my-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : notes && notes.length > 0 ? (
        <ScrollArea className="h-[400px] rounded-md">
          <div className="space-y-4 p-1">
            {notes.map((note) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(note.category)}
                      <CardTitle className="text-base">{note.title}</CardTitle>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEditNote(note)}
                        className="h-7 w-7"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteNote(note.id)}
                        className="h-7 w-7 text-destructive"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="flex items-center text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(note.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mb-2 opacity-20" />
          <p>Nessuna nota disponibile</p>
          <p className="text-sm">Crea una nuova nota per questo cliente</p>
        </div>
      )}
    </div>
  );
}