import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function Terms() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="mb-4"
            data-testid="button-back-home"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('terms.backButton')}
          </Button>
          <h1 className="text-4xl font-bold text-primary border-b-2 border-primary pb-3">
            {t('terms.title')}
          </h1>
          <div className="mt-4 p-4 bg-blue-50 border-l-4 border-primary rounded-r-lg">
            <p><strong>{t('terms.effectiveDate')}</strong></p>
            <p><strong>{t('terms.lastModified')}</strong></p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.acceptance.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.acceptance.text')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.description.title')}</h2>
              <p className="text-muted-foreground mb-4">
                {t('terms.sections.description.intro')}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>{t('terms.sections.description.items.bookings')}</li>
                <li>{t('terms.sections.description.items.clients')}</li>
                <li>{t('terms.sections.description.items.billing')}</li>
                <li>{t('terms.sections.description.items.communications')}</li>
                <li>{t('terms.sections.description.items.reports')}</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                {t('terms.sections.description.footer')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.plans.title')}</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">{t('terms.sections.plans.base.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>{t('terms.sections.plans.base.items.clients')}</li>
                    <li>{t('terms.sections.plans.base.items.calendar')}</li>
                    <li>{t('terms.sections.plans.base.items.billing')}</li>
                    <li>{t('terms.sections.plans.base.items.support')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">{t('terms.sections.plans.pro.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>{t('terms.sections.plans.pro.items.clients')}</li>
                    <li>{t('terms.sections.plans.pro.items.whatsapp')}</li>
                    <li>{t('terms.sections.plans.pro.items.reports')}</li>
                    <li>{t('terms.sections.plans.pro.items.qr')}</li>
                    <li>{t('terms.sections.plans.pro.items.support')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">{t('terms.sections.plans.business.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>{t('terms.sections.plans.business.items.all')}</li>
                    <li>{t('terms.sections.plans.business.items.unlimited')}</li>
                    <li>{t('terms.sections.plans.business.items.multiUser')}</li>
                    <li>{t('terms.sections.plans.business.items.customization')}</li>
                    <li>{t('terms.sections.plans.business.items.backup')}</li>
                    <li>{t('terms.sections.plans.business.items.support')}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.userResponsibilities.title')}</h2>
              <p className="text-muted-foreground mb-4">{t('terms.sections.userResponsibilities.intro')}</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>{t('terms.sections.userResponsibilities.items.law')}</li>
                <li>{t('terms.sections.userResponsibilities.items.credentials')}</li>
                <li>{t('terms.sections.userResponsibilities.items.data')}</li>
                <li>{t('terms.sections.userResponsibilities.items.privacy')}</li>
                <li>{t('terms.sections.userResponsibilities.items.backup')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.privacyData.title')}</h2>
              <p className="text-muted-foreground mb-4">
                {t('terms.sections.privacyData.text')}
              </p>
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                <p className="font-semibold text-yellow-800 mb-2">{t('terms.sections.privacyData.important')}</p>
                <p className="text-yellow-700">
                  {t('terms.sections.privacyData.warning')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.limitations.title')}</h2>
              <p className="text-muted-foreground mb-4">
                {t('terms.sections.limitations.intro')}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>{t('terms.sections.limitations.items.availability')}</li>
                <li>{t('terms.sections.limitations.items.errors')}</li>
                <li>{t('terms.sections.limitations.items.compatibility')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.billing.title')}</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>{t('terms.sections.billing.items.monthly')}</li>
                <li>{t('terms.sections.billing.items.advance')}</li>
                <li>{t('terms.sections.billing.items.refunds')}</li>
                <li>{t('terms.sections.billing.items.priceChanges')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.termination.title')}</h2>
              <p className="text-muted-foreground mb-4">{t('terms.sections.termination.intro')}</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>{t('terms.sections.termination.items.user')}</li>
                <li>{t('terms.sections.termination.items.provider')}</li>
                <li>{t('terms.sections.termination.items.payment')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.modifications.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.sections.modifications.text')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.law.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.sections.law.text')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{t('terms.sections.contact.title')}</h2>
              <p className="text-muted-foreground mb-4">{t('terms.sections.contact.intro')}</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>{t('terms.sections.contact.email')}</strong></li>
                <li><strong>{t('terms.sections.contact.developer')}</strong></li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="p-6 text-center">
              <p className="font-semibold text-foreground">{t('terms.footer.version')}</p>
              <p className="text-muted-foreground">{t('terms.footer.copyright')}</p>
            </CardContent>
          </Card>

          <div className="text-center pt-6">
            <Button onClick={() => navigate("/")} size="lg" data-testid="button-back-home-bottom">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('terms.backButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
