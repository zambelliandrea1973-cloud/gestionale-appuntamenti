import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

interface ScrollDownHintProps {
  threshold?: number;
}

export default function ScrollDownHint({ threshold = 80 }: ScrollDownHintProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const compute = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const viewport = window.innerHeight || 0;
      const fullHeight = document.documentElement.scrollHeight || 0;
      const hasMoreBelow = fullHeight - (scrollY + viewport) > threshold;
      const userScrolledABit = scrollY > 8;
      setVisible(hasMoreBelow && !userScrolledABit);
    };

    compute();
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    const interval = window.setInterval(compute, 1500);

    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
      window.clearInterval(interval);
    };
  }, [threshold]);

  const handleClick = () => {
    window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-hidden={!visible}
      aria-label={t('common.scrollDown')}
      tabIndex={visible ? 0 : -1}
      data-testid="scroll-down-hint"
      className={`fixed bottom-20 right-4 sm:bottom-8 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 px-3 py-2 transition-all duration-300 ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <span className="text-xs font-medium hidden sm:inline">
        {t('common.scrollDown')}
      </span>
      <ChevronDown className="h-4 w-4 animate-bounce" />
    </button>
  );
}
