import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface Promotion {
  id: number;
  title: string;
  message: string;
  attachmentPaths: string[] | null;
  attachmentTypes: ('image' | 'video')[] | null;
  createdAt: string;
}

export default function PromotionPage() {
  const { code } = useParams<{ code: string }>();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  useEffect(() => {
    const fetchPromotion = async () => {
      if (!code) return;

      try {
        const response = await fetch(`/api/promotions/${code}`);
        
        if (response.ok) {
          const data = await response.json();
          setPromotion(data.campaign);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Errore caricamento promozione:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotion();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error || !promotion) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <CardTitle>Promozione non trovata</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Il link che hai seguito non è valido o la promozione è scaduta.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Promozione Speciale</h1>
          </div>
        </div>

        {/* Contenuto promozione */}
        <Card className="overflow-hidden shadow-xl">
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle className="text-2xl text-center">
              {promotion.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Media Carousel */}
            {promotion.attachmentPaths && promotion.attachmentPaths.length > 0 && (
              <div className="relative w-full bg-black group">
                {/* Media attuale */}
                <div className="w-full">
                  {promotion.attachmentTypes?.[currentMediaIndex] === 'image' ? (
                    <img
                      key={currentMediaIndex}
                      src={promotion.attachmentPaths[currentMediaIndex]}
                      alt={`${promotion.title} - ${currentMediaIndex + 1}`}
                      className="w-full h-auto max-h-[600px] object-contain"
                    />
                  ) : (
                    <video
                      src={promotion.attachmentPaths[currentMediaIndex]}
                      controls
                      className="w-full h-auto max-h-[600px]"
                      key={currentMediaIndex}
                    >
                      Il tuo browser non supporta i video.
                    </video>
                  )}
                </div>

                {/* Controlli carousel (solo se ci sono più file) */}
                {promotion.attachmentPaths.length > 1 && (
                  <>
                    {/* Pulsanti prev/next */}
                    <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setCurrentMediaIndex((prev) => 
                          prev === 0 ? promotion.attachmentPaths!.length - 1 : prev - 1
                        )}
                        className="bg-black/50 hover:bg-black/70 text-white"
                        disabled={promotion.attachmentPaths.length === 1}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setCurrentMediaIndex((prev) => 
                          prev === promotion.attachmentPaths!.length - 1 ? 0 : prev + 1
                        )}
                        className="bg-black/50 hover:bg-black/70 text-white"
                        disabled={promotion.attachmentPaths.length === 1}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                    </div>

                    {/* Indicatori */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                      {promotion.attachmentPaths.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentMediaIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentMediaIndex 
                              ? 'bg-white w-8' 
                              : 'bg-white/50 hover:bg-white/75'
                          }`}
                          aria-label={`Vai al file ${index + 1}`}
                        />
                      ))}
                    </div>

                    {/* Contatore */}
                    <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentMediaIndex + 1} / {promotion.attachmentPaths.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Messaggio */}
            <div className="p-6">
              <div className="prose max-w-none">
                <p className="text-lg whitespace-pre-wrap leading-relaxed">
                  {promotion.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>Promozione valida. Contattaci per maggiori informazioni!</p>
        </div>
      </div>
    </div>
  );
}
