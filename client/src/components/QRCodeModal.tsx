import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Download, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectLinkGenerator } from "./DirectLinkGenerator";

interface QRCodeModalProps {
  clientId: number;
  clientName: string;
  open: boolean;
  onClose: () => void;
  onQrCodeGenerated?: (qrCode: string) => void;
  initialTab?: "qrcode" | "link";
}

export default function QRCodeModal({ clientId, clientName, open, onClose, onQrCodeGenerated, initialTab = "qrcode" }: QRCodeModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<any>(null);

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      console.log("🔍 [FRONTEND] QR request for client:", clientName, `(ID: ${clientId})`);
      const response = await apiRequest("GET", `/api/clients/${clientId}/activation-token`);
      return response.json();
    },
    onSuccess: (data) => {
      console.log("QR code generato con successo:", data);
      setQrCode(data.qrCode);
      setActivationUrl(data.activationUrl);
      setIsGenerating(false);

      if (onQrCodeGenerated && data.qrCode) {
        onQrCodeGenerated(data.qrCode);
      }

      toast({
        title: t('qrCodeModal.tokenGeneratedTitle'),
        description: t('qrCodeModal.tokenGeneratedDescription'),
      });

      const timer = setTimeout(() => {
        console.log("Auto-closing dialog after QR generation");
        onClose();
      }, 1500);

      setAutoCloseTimer(timer);
    },
    onError: (error: any) => {
      console.error("Error generating QR code:", error);
      setIsGenerating(false);
      toast({
        title: t('common.error'),
        description: t('common.errorWithMessage', { message: error.message }),
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (open && !qrCode && !isGenerating && !generateTokenMutation.isPending) {
      console.log("Starting QR code generation...");
      generateTokenMutation.mutate();
    }

    return () => {
      if (autoCloseTimer) {
        console.log("Cleaning up auto-close timer");
        clearTimeout(autoCloseTimer);
      }
    };
  }, [open, qrCode, isGenerating, generateTokenMutation.isPending]);

  const downloadQrCode = () => {
    if (!qrCode) return;

    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `qr-attivazione-${clientName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t('qrCodeModal.qrDownloadedTitle'),
      description: t('qrCodeModal.qrDownloadedDescription'),
    });
  };

  const copyActivationUrl = () => {
    if (!activationUrl) return;

    navigator.clipboard.writeText(activationUrl)
      .then(() => {
        toast({
          title: t('qrCodeModal.urlCopiedTitle'),
          description: t('qrCodeModal.urlCopiedDescription'),
        });
      })
      .catch((err) => {
        toast({
          title: t('common.error'),
          description: t('qrCodeModal.copyUrlError'),
          variant: "destructive",
        });
      });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-[1200px]:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('qrCodeModal.title')}</DialogTitle>
          <DialogDescription>
            {t('qrCodeModal.description', { clientName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4">
          {isGenerating || generateTokenMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-gray-500">{t('qrCodeModal.generating')}</p>
            </div>
          ) : qrCode ? (
            <Tabs defaultValue={initialTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qrcode">{t('qrCodeModal.qrCodeTab')}</TabsTrigger>
                <TabsTrigger value="link">{t('qrCodeModal.linkTab')}</TabsTrigger>
              </TabsList>

              <TabsContent value="qrcode" className="flex flex-col items-center">
                <div className="border rounded-md p-2 bg-white">
                  <img src={qrCode} alt={t('qrCodeModal.qrCodeAlt')} className="w-64 h-64" />
                </div>



                <div className="flex space-x-2 mt-4">
                  <Button variant="outline" size="sm" onClick={downloadQrCode}>
                    <Download className="mr-2 h-4 w-4" />
                    {t('qrCodeModal.downloadButton')}
                  </Button>
                </div>

                <p className="mt-4 text-sm text-gray-500 text-center">
                  {t('qrCodeModal.shareNote')}
                </p>
              </TabsContent>

              <TabsContent value="link" className="flex flex-col">
                {activationUrl && (
                  <div>
                    <div className="mb-4">
                      <div className="font-medium mb-2">{t('qrCodeModal.activationLinkTitle')}</div>
                      <div className="flex items-center space-x-2">
                        <div className="border rounded-md p-2 flex-1 bg-muted overflow-hidden">
                          <p className="text-sm text-muted-foreground truncate">
                            {activationUrl || t('qrCodeModal.urlNotAvailable')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={copyActivationUrl}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      {activationUrl.split('token=')[1] && (
                        <DirectLinkGenerator
                          token={activationUrl.split('token=')[1].split('&')[0]}
                          clientId={clientId}
                          clientName={clientName}
                        />
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <QrCode className="w-12 h-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">{t('qrCodeModal.noQrGenerated')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
