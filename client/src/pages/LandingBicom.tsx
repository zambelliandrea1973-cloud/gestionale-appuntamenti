import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, Bell, Smartphone, Shield, Clock, CheckCircle, Mail, Phone, Globe, Star, Zap, BarChart3, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingBicom() {
  const { t } = useTranslation();
  const [, setShowContact] = useState(false);

  const features = [
    { icon: Calendar, title: t('landingBicom.features.scheduling.title'), desc: t('landingBicom.features.scheduling.desc') },
    { icon: Users, title: t('landingBicom.features.patients.title'), desc: t('landingBicom.features.patients.desc') },
    { icon: Bell, title: t('landingBicom.features.notifications.title'), desc: t('landingBicom.features.notifications.desc') },
    { icon: Smartphone, title: t('landingBicom.features.app.title'), desc: t('landingBicom.features.app.desc') },
    { icon: Shield, title: t('landingBicom.features.clientArea.title'), desc: t('landingBicom.features.clientArea.desc') },
    { icon: Clock, title: t('landingBicom.features.booking.title'), desc: t('landingBicom.features.booking.desc') },
    { icon: CheckCircle, title: t('landingBicom.features.invoicing.title'), desc: t('landingBicom.features.invoicing.desc') },
    { icon: Globe, title: t('landingBicom.features.multilang.title'), desc: t('landingBicom.features.multilang.desc') },
    { icon: HeartPulse, title: t('landingBicom.features.custom.title'), desc: t('landingBicom.features.custom.desc') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <HeartPulse className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('landingBicom.header.title')}</h1>
              <p className="text-xs text-gray-500">{t('landingBicom.header.subtitle')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">{t('landingBicom.header.date')}</p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            {t('landingBicom.hero.badge')}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t('landingBicom.hero.titleLine1')}<br />
            <span className="text-blue-600">{t('landingBicom.hero.titleLine2')}</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {t('landingBicom.hero.subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowContact(true)}>
              <Mail className="mr-2 h-5 w-5" />
              {t('landingBicom.hero.demoButton')}
            </Button>
            <Button size="lg" variant="outline">
              <Phone className="mr-2 h-5 w-5" />
              +39 347 255 0110
            </Button>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t('landingBicom.valueProp.title')}
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-blue-100 hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>{t('landingBicom.valueProp.unique.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {t('landingBicom.valueProp.unique.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-100 hover:border-green-300 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>{t('landingBicom.valueProp.value.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {t('landingBicom.valueProp.value.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-100 hover:border-purple-300 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>{t('landingBicom.valueProp.loyalty.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {t('landingBicom.valueProp.loyalty.desc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">
            {t('landingBicom.features.title')}
          </h3>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            {t('landingBicom.features.subtitle')}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Models */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t('landingBicom.partnership.title')}
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-blue-300 transition-colors">
              <CardHeader className="bg-gradient-to-br from-slate-50 to-slate-100">
                <CardTitle className="text-center">
                  <span className="text-sm text-gray-500 block mb-2">{t('landingBicom.partnership.option1')}</span>
                  {t('landingBicom.partnership.whiteLabel.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.whiteLabel.f1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.whiteLabel.f2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.whiteLabel.f3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.whiteLabel.f4')}</span>
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-bold text-gray-900">{t('landingBicom.partnership.priceTbd')}</p>
                  <p className="text-sm text-gray-500">{t('landingBicom.partnership.priceTbdSub')}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                {t('landingBicom.partnership.recommended')}
              </div>
              <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-100">
                <CardTitle className="text-center">
                  <span className="text-sm text-blue-600 block mb-2">{t('landingBicom.partnership.option2')}</span>
                  {t('landingBicom.partnership.royalty.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.royalty.f1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.royalty.f2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.royalty.f3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.royalty.f4')}</span>
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-bold text-blue-600">{t('landingBicom.partnership.priceTbd')}</p>
                  <p className="text-sm text-gray-500">{t('landingBicom.partnership.priceTbdSub')}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-300 transition-colors">
              <CardHeader className="bg-gradient-to-br from-slate-50 to-slate-100">
                <CardTitle className="text-center">
                  <span className="text-sm text-gray-500 block mb-2">{t('landingBicom.partnership.option3')}</span>
                  {t('landingBicom.partnership.hybrid.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.hybrid.f1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.hybrid.f2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.hybrid.f3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t('landingBicom.partnership.hybrid.f4')}</span>
                  </li>
                </ul>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-bold text-gray-900">{t('landingBicom.partnership.priceTbd')}</p>
                  <p className="text-sm text-gray-500">{t('landingBicom.partnership.priceTbdSubAlt')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold mb-2">100%</p>
              <p className="text-blue-100">{t('landingBicom.stats.cloud')}</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">9</p>
              <p className="text-blue-100">{t('landingBicom.stats.languages')}</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">PWA</p>
              <p className="text-blue-100">{t('landingBicom.stats.platform')}</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">GDPR</p>
              <p className="text-blue-100">{t('landingBicom.stats.compliant')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">
            {t('landingBicom.cta.title')}
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            {t('landingBicom.cta.subtitle')}
          </p>

          <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-blue-100">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <div className="text-center md:text-left">
                  <p className="font-semibold text-gray-900">Andrea Zambelli</p>
                  <p className="text-gray-600">{t('landingBicom.cta.role')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="tel:+393472550110" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Phone className="h-4 w-4" />
                    +39 347 255 0110
                  </a>
                  <a href="mailto:zambelli.andrea.1973@gmail.com" className="inline-flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                    <Mail className="h-4 w-4" />
                    {t('landingBicom.cta.email')}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            {t('landingBicom.footer.line1')}
          </p>
          <p className="text-gray-500 text-xs mt-2">
            {t('landingBicom.footer.line2')}
          </p>
        </div>
      </footer>
    </div>
  );
}
