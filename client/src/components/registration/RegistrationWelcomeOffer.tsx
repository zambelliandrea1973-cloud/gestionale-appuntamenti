import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Check, MessageCircle } from "lucide-react";

export interface RegistrationWelcomeOfferProps {
  title: string;
  introduction: string;
  offerTitle: string;
  offerDescription: string;
  whatsappLabel: string;
  continueLabel: string;
  whatsappHref: string;
  onContinue: () => void;
}

export function RegistrationWelcomeOffer({
  title,
  introduction,
  offerTitle,
  offerDescription,
  whatsappLabel,
  continueLabel,
  whatsappHref,
  onContinue,
}: RegistrationWelcomeOfferProps) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f4f3ed] px-4 py-8 text-[#28352f] sm:px-6">
      <Card className="relative w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-[#dce3d9] bg-[#fbfcf8] shadow-[0_24px_70px_-38px_rgba(38,58,47,0.35)]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2 bg-[#728c68]"
        />
        <CardContent className="p-6 pt-9 sm:p-10 sm:pt-12 md:p-12 md:pt-14">
          <header className="mx-auto max-w-xl text-center">
            <div
              aria-hidden="true"
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#d5dfd0] bg-[#edf2e9] text-[#58734f] shadow-[inset_0_0_0_5px_rgba(255,255,255,0.72)]"
            >
              <Check className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <h1 className="text-balance text-3xl font-semibold leading-tight tracking-[-0.035em] text-[#28352f] sm:text-4xl">
              {title}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-7 text-[#657269] sm:text-lg sm:leading-8">
              {introduction}
            </p>
          </header>

          <section
            aria-labelledby="registration-welcome-offer-title"
            className="relative mt-8 overflow-hidden rounded-2xl border border-[#e2d9c9] bg-[#f7f2e9] p-5 sm:mt-10 sm:p-7"
          >
            <div
              aria-hidden="true"
              className="absolute -right-10 -top-12 h-36 w-36 rounded-full border border-[#e4dac8]"
            />
            <div
              aria-hidden="true"
              className="absolute -right-4 -top-6 h-24 w-24 rounded-full border border-[#e4dac8]"
            />
            <div className="relative">
              <div className="mb-4 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-[#9b8461]"
                />
                <h2
                  id="registration-welcome-offer-title"
                  className="text-sm font-semibold uppercase tracking-[0.13em] text-[#806b4d]"
                >
                  {offerTitle}
                </h2>
              </div>
              <p className="max-w-xl text-pretty text-[1.05rem] leading-7 text-[#49564d] sm:text-lg sm:leading-8">
                {offerDescription}
              </p>
            </div>
          </section>

          <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2">
            <Button
              asChild
              className="h-12 w-full rounded-xl bg-[#55775e] px-5 text-base font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#476850] focus-visible:ring-[#55775e] sm:order-1"
            >
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={whatsappLabel}
              >
                <MessageCircle className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
                {whatsappLabel}
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onContinue}
              className="h-12 w-full rounded-xl border-[#d6ded5] bg-[#fbfcf8] px-5 text-base font-semibold text-[#35443a] transition-colors hover:bg-[#eef2eb] hover:text-[#28352f] focus-visible:ring-[#55775e] sm:order-2"
            >
              {continueLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
