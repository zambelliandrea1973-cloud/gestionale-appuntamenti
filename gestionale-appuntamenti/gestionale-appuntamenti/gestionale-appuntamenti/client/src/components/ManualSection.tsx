/**
 * ManualSection Component
 * Componente riutilizzabile per rendering consistente delle sezioni del manuale
 * 
 * Pattern di visualizzazione:
 * 1. Testo descrittivo con bordo verde (sempre visibile)
 * 2. Media (video/immagini) sotto il testo (se presenti)
 */

import { Play, Image as ImageIcon } from "lucide-react";

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

interface ManualSectionProps {
  steps: ManualStep[];
  isLoading?: boolean;
  fallbackContent?: React.ReactNode;
}

/**
 * Componente ManualSection
 * Renderizza una sezione del manuale con il pattern standardizzato:
 * - Testo con bordo verde
 * - Video/immagini sotto
 */
export function ManualSection({ steps, isLoading, fallbackContent }: ManualSectionProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>
    );
  }

  // Nessun contenuto disponibile
  if (!steps || steps.length === 0) {
    return fallbackContent ? (
      <>{fallbackContent}</>
    ) : (
      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
        <p className="text-sm text-muted-foreground">
          Nessun contenuto disponibile per questa sezione.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {steps.map((step, stepIndex) => (
        <div key={stepIndex} className="space-y-3">
          {/* PATTERN FISSO: Testo descrittivo con bordo verde (sempre mostrato) */}
          {step.content && (
            <div className="border-l-4 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
              <p 
                className="text-sm text-green-900 dark:text-green-50 whitespace-pre-line" 
                data-testid={`text-step${step.stepNumber}-content`}
              >
                {step.content}
              </p>
            </div>
          )}

          {/* PATTERN FISSO: Media (video/immagini) SOTTO il testo */}
          {step.mediaFiles && step.mediaFiles.length > 0 && (
            <div className="space-y-2">
              {step.mediaFiles.map((media, mediaIndex) => (
                <div key={mediaIndex} data-testid={`card-step${step.stepNumber}-media-${mediaIndex}`}>
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={media.caption || `Media ${mediaIndex + 1}`}
                      className="w-full rounded"
                    />
                  ) : (
                    <video
                      src={media.url}
                      controls
                      className="w-full rounded"
                    />
                  )}
                  {media.caption && (
                    <p 
                      className="text-sm text-muted-foreground mt-1" 
                      data-testid={`text-step${step.stepNumber}-caption-${mediaIndex}`}
                    >
                      {media.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
