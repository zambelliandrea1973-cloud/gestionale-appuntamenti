import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get("token");
    if (resetToken) {
      setToken(resetToken);
      verifyToken(resetToken);
    } else {
      setError(t('resetPassword.tokenNotFound'));
    }
  }, []);

  const verifyToken = async (resetToken: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/verify-reset-token", { token: resetToken });
      if (!response.ok) {
        setError(t('resetPassword.tokenInvalid'));
      }
    } catch (err) {
      setError(t('resetPassword.tokenVerifyError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError(t('resetPassword.bothFieldsRequired'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.passwordsMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('resetPassword.passwordTooShort'));
      return;
    }

    setIsResetting(true);
    try {
      const response = await apiRequest("POST", "/api/reset-password", {
        token,
        newPassword,
      });

      if (response.ok) {
        toast({
          title: t('resetPassword.success'),
          description: t('resetPassword.successDesc'),
        });
        setTimeout(() => navigate("/login"), 2000);
      } else if (response.status === 429) {
        setError(t('resetPassword.rateLimitError'));
      } else if (response.status === 400) {
        setError(t('resetPassword.tokenInvalid'));
      } else {
        setError(t('resetPassword.resetError'));
      }
    } catch (err) {
      setError(t('resetPassword.resetError'));
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">{t('resetPassword.verifying')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{t('resetPassword.title')}</CardTitle>
            <CardDescription>{t('resetPassword.description')}</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('resetPassword.error')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('resetPassword.newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('resetPassword.newPasswordPlaceholder')}
                    disabled={isResetting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                    disabled={isResetting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isResetting}>
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('resetPassword.resetting')}
                  </>
                ) : (
                  t('resetPassword.submit')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
