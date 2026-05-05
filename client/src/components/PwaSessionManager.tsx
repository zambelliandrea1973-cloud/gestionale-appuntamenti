import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PwaSessionManager({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const verifySession = async () => {
      try {
        const isPWA = 
          window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone || 
          document.referrer.includes('android-app://');
        
        console.log("PwaSessionManager - Checking session, isPWA:", isPWA);
        
        const token = localStorage.getItem('clientAccessToken');
        const clientId = localStorage.getItem('clientId');
        
        if (!token || !clientId) {
          console.log("PwaSessionManager - No token or clientId found");
          setIsAuthenticated(false);
          setIsLoading(false);
          if (isPWA) {
            toast({
              title: t('i18nFinale.pwaSession.expiredTitle'),
              description: t('i18nFinale.pwaSession.expiredDesc'),
              variant: "destructive",
            });
            setTimeout(() => {
              setLocation("/client-login");
            }, 1000);
          }
          return;
        }
        
        console.log("PwaSessionManager - Verifying token");
        const response = await apiRequest('POST', '/api/verify-token', { 
          token, 
          clientId: parseInt(clientId, 10) 
        });
        
        if (response.ok) {
          console.log("PwaSessionManager - Token valid");
          setIsAuthenticated(true);
        } else {
          console.log("PwaSessionManager - Token invalid, session expired");
          setIsAuthenticated(false);
          
          if (isPWA) {
            toast({
              title: t('i18nFinale.pwaSession.expiredTitle'),
              description: t('i18nFinale.pwaSession.expiredDesc'),
              variant: "destructive",
            });
            setTimeout(() => {
              setLocation("/client-login");
            }, 1000);
          }
        }
      } catch (error) {
        console.error("PwaSessionManager - Session verification error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    verifySession();
  }, [setLocation, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{t('i18nFinale.pwaSession.verifying')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
