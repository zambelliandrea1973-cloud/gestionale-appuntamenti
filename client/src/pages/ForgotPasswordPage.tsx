import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, ArrowLeft, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email) {
      setError(t('forgotPassword.emailRequired'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      if (res.ok) {
        setSuccessMessage(t('forgotPassword.emailSentDefault'));
        toast({
          title: t('forgotPassword.toastTitle'),
          description: t('forgotPassword.toastDesc'),
        });
        setEmail("");
        setTimeout(() => navigate("/login"), 3000);
      } else if (res.status === 429) {
        setError(t('forgotPassword.rateLimitError'));
      } else {
        setError(t('forgotPassword.sendError'));
      }
    } catch {
      setError(t('forgotPassword.sendError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{t('forgotPassword.title')}</CardTitle>
            <CardDescription className="text-center">
              {t('forgotPassword.description')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('forgotPassword.error')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <Mail className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900">{t('forgotPassword.success')}</AlertTitle>
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('forgotPassword.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('forgotPassword.emailPlaceholder')}
                  disabled={isLoading || !!successMessage}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !!successMessage}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('forgotPassword.sending')}
                  </>
                ) : (
                  t('forgotPassword.submit')
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 text-center text-sm border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('forgotPassword.backToLogin')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
