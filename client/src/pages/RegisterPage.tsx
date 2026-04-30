import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Gift, CheckCircle2, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";

const COMMON_DOMAINS = [
  "gmail.com", "hotmail.com", "hotmail.it", "outlook.com", "outlook.it",
  "yahoo.com", "yahoo.it", "libero.it", "alice.it", "tiscali.it",
  "virgilio.it", "tin.it", "icloud.com", "live.com", "live.it", "pec.it"
];

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  if (COMMON_DOMAINS.includes(domain)) return null;
  let best: { d: string; dist: number } | null = null;
  for (const d of COMMON_DOMAINS) {
    const dist = levenshtein(domain, d);
    if (dist > 0 && dist <= 2 && (!best || dist < best.dist)) best = { d, dist };
  }
  if (!best) return null;
  return email.slice(0, at + 1) + best.d;
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const emailSuggestion = useMemo(() => suggestEmailFix(email), [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(t('registerPage.validationEmailPasswordRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('registerPage.validationInvalidEmail'));
      return;
    }
    if (password.length < 8) {
      setError(t('registerPage.validationPasswordTooShort'));
      return;
    }
    if (!termsAccepted) {
      setError(t('registerPage.validationAcceptTerms'));
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest("POST", "/api/register", {
        email: email.trim().toLowerCase(),
        password,
        referralCode: referralCode.trim() || undefined,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || t('registerPage.registrationError'));
      }

      const data = await response.json();
      // Tracciamento conversione Google Ads — registrazione completata
      try {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'conversion', { send_to: 'AW-18109628280' });
          window.gtag('event', 'sign_up', { method: 'email' });
        }
      } catch (_) {}
      // Auto-login lato server, invalida cache utente e vai alla dashboard
      await queryClient.invalidateQueries();
      if (data.autoLogin) {
        navigate("/dashboard");
      } else {
        navigate(`/login?username=${encodeURIComponent(data.username || email)}`);
      }
    } catch (err: any) {
      setError(err.message || t('registerPage.genericRegistrationError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 md:p-8 bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="w-full max-w-md">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">{t('registerPage.title')}</CardTitle>
            <CardDescription className="text-center">
              {t('registerPage.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('registerPage.errorTitle')}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('registerPage.emailLabel')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('registerPage.emailPlaceholder')}
                    className="pl-9 h-12"
                    required
                    data-testid="input-email"
                  />
                </div>
                {emailSuggestion && (
                  <p className="text-xs text-amber-600">
                    {t('registerPage.didYouMean')}{" "}
                    <button
                      type="button"
                      onClick={() => setEmail(emailSuggestion)}
                      className="font-semibold underline"
                      data-testid="button-email-suggestion"
                    >
                      {emailSuggestion}
                    </button>
                    ?
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('registerPage.passwordLabel')}</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('registerPage.passwordPlaceholder')}
                  className="h-12"
                  data-testid="input-password"
                />
              </div>

              {email.length > 3 && password.length >= 6 && (
                <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="referralCode" className="text-sm">
                    {t('registerPage.referralCodeLabel')} <span className="text-muted-foreground font-normal">{t('registerPage.optional')}</span>
                  </Label>
                  <Input
                    id="referralCode"
                    name="referralCode"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder={t('registerPage.referralCodePlaceholder')}
                    className="h-11 uppercase tracking-wider"
                    data-testid="input-referral-code"
                  />
                  <p className="text-xs text-muted-foreground leading-snug">
                    {t('registerPage.referralCodeHint')}
                  </p>
                </div>
              )}

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="termsAccepted"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                  data-testid="checkbox-terms-accepted"
                />
                <Label htmlFor="termsAccepted" className="text-xs font-normal cursor-pointer leading-snug">
                  {t('registerPage.acceptPrefix')}{" "}
                  <a href="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    {t('registerPage.termsLink')}
                  </a>
                  {" "}{t('registerPage.andThe')}{" "}
                  <a href="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    {t('registerPage.privacyLink')}
                  </a>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={loading}
                data-testid="button-submit-register"
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {loading ? t('registerPage.creating') : t('registerPage.createButton')}
              </Button>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-xs text-primary">{t('registerPage.trialTitle')}</h3>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                    <span>{t('registerPage.trialFeature1')}</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                    <span>{t('registerPage.trialFeature2')}</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                    <span>{t('registerPage.trialFeature3')}</span>
                  </li>
                </ul>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm">
            <div>{t('registerPage.haveAccount')} <a href="/login" className="text-primary hover:underline font-semibold">{t('registerPage.signIn')}</a></div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
