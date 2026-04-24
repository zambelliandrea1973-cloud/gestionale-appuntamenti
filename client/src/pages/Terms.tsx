import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { LegalBlock } from "./PrivacyPolicy";

type Block =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ulStrong'; items: { strong: string; text: string }[] }
  | { type: 'callout'; variant?: string; heading?: string; text: string };

type Section = { heading: string; blocks: Block[] };

type Plan = {
  id: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  savingsAmount: string;
  clientLimit: string;
  featuresHeader: 'featuresIncluded' | 'featuresIncludedExtra' | 'featuresIncludedAll';
  features: string[];
};

type PlansLabels = {
  monthly: string;
  annual: string;
  savings: string;
  clientLimit: string;
  unlimited: string;
  featuresIncluded: string;
  featuresIncludedExtra: string;
  featuresIncludedAll: string;
};

export default function Terms() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const sections = (t('legal.terms.sections', { returnObjects: true }) as Section[]) ?? [];
  const plans = (t('legal.terms.plans', { returnObjects: true }) as Plan[]) ?? [];
  const labels = (t('legal.terms.plansLabels', { returnObjects: true }) as PlansLabels) ?? ({} as PlansLabels);
  const plansHeading = t('legal.terms.plansHeading');
  const footer = t('legal.terms.footer', { returnObjects: true }) as { version: string; copyright: string };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.backToHomeBilingual')}
          </Button>
          <h1 className="text-4xl font-bold text-primary border-b-2 border-primary pb-3">
            {t('legal.terms.title')}
          </h1>
          <div className="mt-4 p-4 bg-blue-50 border-l-4 border-primary rounded-r-lg">
            <p>
              <strong>{t('legal.terms.effectiveDate')}:</strong>{' '}
              {t('legal.terms.effectiveDateValue')}
            </p>
            <p>
              <strong>{t('legal.terms.lastModified')}:</strong>{' '}
              {t('legal.terms.lastModifiedValue')}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {sections.slice(0, 2).map((section, i) => (
            <Card key={`pre-${i}`}>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold text-blue-900 mb-4">
                  {section.heading}
                </h2>
                <div className="text-muted-foreground leading-relaxed space-y-4 prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-6 [&_p]:m-0">
                  {section.blocks.map((block, j) => (
                    <LegalBlock key={j} block={block} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold text-blue-900 mb-4">{plansHeading}</h2>
              <div className="space-y-6">
                {plans.map((plan) => {
                  const isFeatured = plan.id === 'professional';
                  const cardCls = isFeatured
                    ? 'p-4 border-2 border-blue-400 rounded-lg bg-blue-50'
                    : 'p-4 border border-gray-300 rounded-lg';
                  const isUnlimited = plan.id === 'business';
                  return (
                    <div key={plan.id} className={cardCls}>
                      <h3 className="text-lg font-semibold text-blue-800 mb-2">{plan.name}</h3>
                      <div className="grid grid-cols-2 gap-2 mb-3 text-muted-foreground">
                        <div>
                          <strong>{labels.monthly}:</strong> {plan.monthlyPrice}
                        </div>
                        <div>
                          <strong>{labels.annual}:</strong> {plan.annualPrice} ({labels.savings} {plan.savingsAmount})
                        </div>
                        <div className="col-span-2">
                          <strong>{labels.clientLimit}:</strong>{' '}
                          {isUnlimited ? labels.unlimited : plan.clientLimit}
                        </div>
                      </div>
                      <p className="font-semibold text-blue-800 mb-2">
                        {labels[plan.featuresHeader]}:
                      </p>
                      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                        {plan.features.map((f, fi) => (
                          <li key={fi}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {sections.slice(2).map((section, i) => (
            <Card key={`post-${i}`}>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold text-blue-900 mb-4">
                  {section.heading}
                </h2>
                <div className="text-muted-foreground leading-relaxed space-y-4 prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-6 [&_p]:m-0">
                  {section.blocks.map((block, j) => (
                    <LegalBlock key={j} block={block} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="bg-muted/50">
            <CardContent className="p-6 text-center">
              <p className="font-semibold text-foreground">{footer.version}</p>
              <p className="text-muted-foreground">{footer.copyright}</p>
            </CardContent>
          </Card>

          <div className="text-center pt-6">
            <Button onClick={() => navigate("/")} size="lg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.backToHomeBilingual')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
