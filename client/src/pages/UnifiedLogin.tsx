import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function UnifiedLogin() {
  const { t } = useTranslation();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const clearSession = async () => {
      try {
        await apiRequest('POST', '/api/logout');
        queryClient.invalidateQueries({ queryKey: ['/api/user-with-license'] });
        queryClient.invalidateQueries({ queryKey: ['/api/contact-info'] });
        queryClient.invalidateQueries({ queryKey: ['/api/company-name-settings'] });
      } catch (error) {
        console.log('No previous session found');
      }
    };
    clearSession();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const usernameParam = params.get('username');
    if (usernameParam) {
      setUsername(decodeURIComponent(usernameParam));
    }
  }, []);

  useEffect(() => {
    const savedUsername = localStorage.getItem("savedLoginUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const keysToKeep = rememberMe ? ['savedLoginUsername', 'i18nextLng'] : ['i18nextLng'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      queryClient.clear();
      await apiRequest('POST', '/api/logout');
      window.location.href = '/login?cleared=1';
    } catch (error) {
      window.location.href = '/login?cleared=1';
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/staff/login", credentials);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login error");
      }
      return response.json();
    },
    onSuccess: async (userData) => {
      const keysToKeep = ['savedLoginUsername', 'i18nextLng'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      if (rememberMe) {
        localStorage.setItem("savedLoginUsername", username);
      } else {
        localStorage.removeItem("savedLoginUsername");
      }

      queryClient.clear();

      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
          }
        }
      } catch (error) {
        console.error('Cache cleanup error:', error);
      }

      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        sessionStorage.removeItem('redirectAfterLogin');
      }

      setTimeout(() => {
        window.location.href = redirectUrl || "/dashboard";
      }, 100);
    },
    onError: (error: Error) => {
      setError(error.message || t('unifiedLoginPage.errorOccurred'));
      toast({
        title: t('unifiedLoginPage.loginError'),
        description: error.message || t('unifiedLoginPage.errorOccurred'),
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError(t('unifiedLoginPage.enterCredentials'));
      return;
    }

    loginMutation.mutate({ username, password });
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {t('unifiedLoginPage.title')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('unifiedLoginPage.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('unifiedLoginPage.error')}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">{t('unifiedLoginPage.username')}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('unifiedLoginPage.usernamePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('unifiedLoginPage.password')}</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('unifiedLoginPage.passwordPlaceholder')}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t('unifiedLoginPage.rememberMe')}
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loginMutation.isPending ? t('unifiedLoginPage.loggingIn') : t('unifiedLoginPage.login')}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 border-t pt-4">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-primary hover:underline w-full text-center"
            >
              {t('unifiedLoginPage.forgotPassword')}
            </button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isClearing}
              onClick={handleClearCache}
            >
              {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              {isClearing ? t('unifiedLoginPage.clearing') : t('unifiedLoginPage.clearCache')}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t('unifiedLoginPage.clearCacheHint')}
            </p>

            <div className="text-sm text-gray-600 text-center pt-2 border-t">
              <div>{t('unifiedLoginPage.noAccount')} <a href="/register" className="text-primary hover:underline">{t('unifiedLoginPage.register')}</a></div>
            </div>
          </CardFooter>
        </Card>

        <div className="hidden md:block p-6">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t('unifiedLoginPage.infoTitle')}
          </h2>
          <p className="text-lg mb-6">
            {t('unifiedLoginPage.infoDesc')}
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{t('unifiedLoginPage.featureCalendar')}</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{t('unifiedLoginPage.featureClients')}</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{t('unifiedLoginPage.featureBilling')}</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2 rounded-full bg-primary/10 p-1 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{t('unifiedLoginPage.featureNotifications')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
