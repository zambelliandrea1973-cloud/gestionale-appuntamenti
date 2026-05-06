import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MANUAL_SECTIONS, MANUAL_FALLBACK_DATA } from "../../../shared/manualSections";

interface ManualMedia {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

interface ManualStep {
  stepNumber: number;
  title: string;
  content: string;
  mediaFiles?: ManualMedia[];
}

interface ManualSectionData {
  id: number | null;
  section: string;
  locale: string;
  title: string;
  steps: ManualStep[];
}

/**
 * Hook per gestire sezioni del manuale con fallback automatico
 * Carica dati dal backend e, se non disponibili (404), usa fallback hardcoded
 * garantendo sempre contenuto significativo anche a DB vuoto.
 */
export function useManualSection(section: string, locale: string) {
  const queryClient = useQueryClient();
  const queryKey = [`/api/manual/content/${section}/${locale}`];

  // Fetch section data with robust JSON parsing + fallback support
  const query = useQuery<ManualSectionData>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/manual/content/${section}/${locale}`);
      
      // 404 = contenuto non salvato, usa fallback hardcoded
      if (response.status === 404) {
        const fallback = MANUAL_FALLBACK_DATA[section];
        const config = MANUAL_SECTIONS[section];
        
        if (fallback) {
          // Costruisci ManualSectionData completo da fallback
          return {
            id: null,
            section,
            locale,
            title: config?.titleIT || 'Sezione Manuale',
            steps: fallback.steps.map((step, idx) => ({
              stepNumber: idx + 1,
              title: config?.titleIT || `Step ${idx + 1}`,
              content: step.content,
              mediaFiles: step.mediaFiles || []
            }))
          };
        }
        
        // Nessun fallback disponibile - errore esplicito
        throw new Error(`No content available for ${section}`);
      }
      
      if (!response.ok) {
        throw new Error(`Error loading section ${section}`);
      }
      
      const data = await response.json();
      
      // PARSING ROBUSTO: gestisce steps come stringa JSON o array già parsato
      let parsedSteps: ManualStep[];
      
      if (typeof data.steps === 'string') {
        try {
          const parsed = JSON.parse(data.steps);
          
          // VALIDAZIONE CRITICA: verifica che sia array
          if (Array.isArray(parsed)) {
            parsedSteps = parsed;
          } else {
            console.warn(`[MANUAL ${section}] JSON.parse OK ma non array:`, typeof parsed);
            parsedSteps = [{
              stepNumber: 1,
              title: data.title || 'Contenuto',
              content: data.steps,
              mediaFiles: []
            }];
          }
        } catch (error) {
          console.warn(`[MANUAL ${section}] JSON.parse fallito, uso fallback:`, error);
          parsedSteps = [{
            stepNumber: 1,
            title: data.title || 'Contenuto',
            content: data.steps,
            mediaFiles: []
          }];
        }
      } else if (Array.isArray(data.steps)) {
        parsedSteps = data.steps;
      } else {
        console.warn(`[MANUAL ${section}] Tipo steps inaspettato:`, typeof data.steps);
        parsedSteps = [];
      }
      
      return {
        id: data.id ?? null,
        section: data.section || section,
        locale: data.locale || locale,
        title: data.title || 'Sezione Manuale',
        steps: parsedSteps
      };
    },
    enabled: !!section && !!locale,
    staleTime: 5 * 60 * 1000, // 5 minuti cache
    refetchOnWindowFocus: false
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; mediaFiles: ManualMedia[] }) => {
      const payload = {
        section,
        locale,
        title: data.title,
        steps: [
          {
            stepNumber: 1,
            title: data.title,
            content: data.content,
            mediaFiles: data.mediaFiles,
          },
        ],
      };

      const response = await apiRequest('POST', '/api/manual/save', payload);
      if (!response.ok) {
        throw new Error('Error saving');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiRequest('POST', '/api/manual/upload', formData);
      if (!response.ok) {
        throw new Error('Error uploading file');
      }
      return response.json();
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileUrl: string) => {
      const response = await apiRequest('DELETE', '/api/manual/file', { fileUrl });
      if (!response.ok) {
        throw new Error('Error deleting file');
      }
      return response.json();
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    uploadFile: uploadFileMutation.mutateAsync,
    isUploading: uploadFileMutation.isPending,
    deleteFile: deleteFileMutation.mutateAsync,
    isDeleting: deleteFileMutation.isPending,
  };
}
