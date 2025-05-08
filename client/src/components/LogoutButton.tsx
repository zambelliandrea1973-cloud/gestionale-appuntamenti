import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter"; 
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Esegui la richiesta di logout
      const response = await apiRequest("POST", "/api/logout");
      
      if (response.ok) {
        // Mostra un toast di successo
        toast({
          title: t("auth.logoutSuccess", "Logout effettuato con successo"),
          description: t("auth.redirecting", "Reindirizzamento in corso..."),
        });
        
        // Reindirizza alla pagina iniziale dopo un breve ritardo
        setTimeout(() => {
          navigate("/");
          // Forza il ricaricamento della pagina per pulire lo stato client
          window.location.reload();
        }, 1500);
      } else {
        // Mostra un messaggio di errore
        toast({
          title: t("auth.logoutError", "Errore durante il logout"),
          description: t("auth.tryAgain", "Si prega di riprovare"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore durante il logout:", error);
      
      toast({
        title: t("auth.logoutError", "Errore durante il logout"),
        description: t("auth.tryAgain", "Si prega di riprovare"),
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      variant="ghost"
      className="flex items-center space-x-1 hover:bg-primary-dark"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      <LogOut className="h-4 w-4" />
      <span>{isLoggingOut ? t("auth.loggingOut", "Uscita...") : t("auth.logout", "Esci")}</span>
    </Button>
  );
}