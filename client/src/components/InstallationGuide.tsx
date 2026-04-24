import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Download, Share, Menu, Plus, ArrowRight, ExternalLink } from "lucide-react";

export const InstallationGuide = () => {
  const { t } = useTranslation();
  const [browserType, setBrowserType] = useState<"chrome" | "safari" | "firefox" | "edge" | "duckduckgo" | "other">("chrome");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf("duckduckgo") > -1) {
      setBrowserType("duckduckgo");
    } else if (userAgent.indexOf("chrome") > -1 && userAgent.indexOf("edg") === -1) {
      setBrowserType("chrome");
    } else if (userAgent.indexOf("safari") > -1 && userAgent.indexOf("chrome") === -1) {
      setBrowserType("safari");
    } else if (userAgent.indexOf("firefox") > -1) {
      setBrowserType("firefox");
    } else if (userAgent.indexOf("edg") > -1) {
      setBrowserType("edge");
    } else {
      setBrowserType("other");
    }
  }, []);

  return (
    <Card className="mt-4 mb-8">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4 text-center">
          {t('installationGuide.heading')}
        </h2>

        <Tabs defaultValue={browserType} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chrome">Chrome</TabsTrigger>
            <TabsTrigger value="safari">Safari</TabsTrigger>
            <TabsTrigger value="edge">Edge</TabsTrigger>
            <TabsTrigger value="firefox">Firefox</TabsTrigger>
            <TabsTrigger value="duckduckgo">DuckDuckGo</TabsTrigger>
          </TabsList>

          <TabsContent value="chrome" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">{t('installationGuide.chrome.title')}</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.chrome.s1Lead')}</span> <Menu className="inline-block h-4 w-4" /> {t('installationGuide.chrome.s1Suffix')}
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/Pnf9sMv.png" alt="Chrome menu" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.chrome.s2Lead')}</span> {t('installationGuide.chrome.s2Suffix')}
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/WU8Q8UZ.png" alt="Chrome install" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.chrome.s3Lead')}</span> {t('installationGuide.chrome.s3Suffix')}
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/BnvYjoH.png" alt="Chrome confirm" className="h-32 object-contain" />
                  </div>
                </li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="safari" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">{t('installationGuide.safari.title')}</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.safari.s1Lead')}</span> <Share className="inline-block h-4 w-4" /> {t('installationGuide.safari.s1Suffix')}
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/uDWkauZ.png" alt="Safari share" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.safari.s2Lead')}</span> <Plus className="inline-block h-4 w-4" />
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/ZMbLzpY.png" alt="Safari add to home" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.safari.s3Lead')}</span> {t('installationGuide.safari.s3Suffix')}
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/q0SzPPI.png" alt="Safari confirm" className="h-32 object-contain" />
                  </div>
                </li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="edge" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">{t('installationGuide.edge.title')}</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.edge.s1Lead')}</span> <Menu className="inline-block h-4 w-4" /> {t('installationGuide.edge.s1Suffix')}
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.edge.s2Lead')}</span> <ArrowRight className="inline-block h-4 w-4" /> <span className="font-medium">{t('installationGuide.edge.s2Suffix')}</span>
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/ZdyhEhY.png" alt="Edge install" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.edge.s3Lead')}</span> {t('installationGuide.edge.s3Suffix')}
                </li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="firefox" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">{t('installationGuide.firefox.title')}</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.firefox.s1Lead')}</span> <Menu className="inline-block h-4 w-4" /> {t('installationGuide.firefox.s1Suffix')}
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.firefox.s2Lead')}</span>
                  <div className="mt-1 bg-white rounded p-2 flex justify-center">
                    <img src="https://i.imgur.com/GPiyIno.png" alt="Firefox add" className="h-32 object-contain" />
                  </div>
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.firefox.s3Lead')}</span> {t('installationGuide.firefox.s3Suffix')}
                </li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="duckduckgo" className="space-y-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">{t('installationGuide.duckduckgo.title')}</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.duckduckgo.s1Lead')}</span> <Menu className="inline-block h-4 w-4" /> {t('installationGuide.duckduckgo.s1Suffix')}
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.duckduckgo.s2Lead')}</span> <Share className="inline-block h-4 w-4" /> {t('installationGuide.duckduckgo.s2Suffix')}
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.duckduckgo.s3Lead')}</span> <ExternalLink className="inline-block h-4 w-4" /> {t('installationGuide.duckduckgo.s3Suffix')}
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.duckduckgo.s4Lead')}</span> {t('installationGuide.duckduckgo.s4Suffix')}
                </li>
                <li className="pb-2">
                  <span className="font-medium">{t('installationGuide.duckduckgo.s5Lead')}</span> {t('installationGuide.duckduckgo.s5Suffix')}
                </li>
              </ol>

              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="font-medium text-amber-800 mb-2">
                  {t('installationGuide.duckduckgo.warningTitle')}
                </p>
                <p className="text-amber-700 text-sm">
                  {t('installationGuide.duckduckgo.warningBody')}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-xs text-gray-500 mt-4 text-center">
          {t('installationGuide.footer')}
        </div>
      </CardContent>
    </Card>
  );
};
