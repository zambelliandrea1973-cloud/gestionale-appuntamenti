import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Block =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ulStrong'; items: { strong: string; text: string }[] }
  | { type: 'callout'; variant?: string; heading?: string; text: string };

type Section = { heading: string; blocks: Block[] };

export function LegalBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p>{block.text}</p>;
    case 'h3':
      return <h3>{block.text}</h3>;
    case 'ul':
      return (
        <ul>
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case 'ulStrong':
      return (
        <ul>
          {block.items.map((it, i) => (
            <li key={i}>
              <strong>{it.strong}:</strong> {it.text}
            </li>
          ))}
        </ul>
      );
    case 'callout': {
      const isWarning = block.variant === 'warning';
      const cls = isWarning
        ? 'not-prose mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-400 rounded'
        : 'not-prose mt-4 p-4 bg-slate-50 dark:bg-slate-900 border-l-4 border-slate-400 rounded';
      return (
        <div className={cls}>
          {block.heading && <p className="font-semibold mb-1">{block.heading}</p>}
          <p className="m-0">{block.text}</p>
        </div>
      );
    }
    default:
      return null;
  }
}

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  const sections = (t('legal.privacy.sections', { returnObjects: true }) as Section[]) ?? [];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <Link to="/">
          <Button variant="outline" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.backToHomeBilingual')}
          </Button>
        </Link>

        <article className="prose dark:prose-invert max-w-none">
          <h1>{t('legal.privacy.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('legal.lastUpdated')}: {t('legal.privacy.lastUpdatedDate')}
          </p>

          <hr />

          {sections.map((section, i) => (
            <section key={i}>
              <h2>{section.heading}</h2>
              {section.blocks.map((block, j) => (
                <LegalBlock key={j} block={block} />
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
