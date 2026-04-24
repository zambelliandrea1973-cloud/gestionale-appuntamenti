import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, CheckCircle2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ConsentFormProps {
  clientId: string;
  embedded?: boolean;
}

export default function ConsentForm({ clientId, embedded = false }: ConsentFormProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const DEFAULT_CONSENT_TEXT = t("consentForm.defaultConsentText");

  const formSchema = useMemo(() => z.object({
    clientId: z.string(),
    consentText: z.string().min(1, t("consentForm.validation.consentTextRequired")),
    consentAccepted: z.boolean().refine(val => val === true, {
      message: t("consentForm.validation.mustAccept")
    }),
    consentType: z.literal("digital_acceptance"),
    fullName: z.string().min(2, t("consentForm.validation.fullNameRequired"))
  }), [t]);

  type FormData = z.infer<typeof formSchema>;

  const { data: client, isLoading: isLoadingClient } = useQuery<any>({
    queryKey: ["/api/clients", clientId]
  });

  const { data: existingConsent, isLoading: isLoadingConsent } = useQuery<any>({
    queryKey: ["/api/consents/client", clientId],
    retry: false
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId,
      consentText: DEFAULT_CONSENT_TEXT,
      consentAccepted: false,
      consentType: "digital_acceptance" as const,
      fullName: ""
    }
  });

  const createConsentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/consents", {
        ...data,
        signature: `${data.fullName} - ${t("consentForm.signaturePrefix")} ${new Date().toLocaleString()}`
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("consentForm.consentRecorded"),
        description: t("consentForm.consentRecordedDesc"),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/consents/client"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-sync"] });
    },
    onError: (error: any) => {
      toast({
        title: t("consentForm.errorTitle"),
        description: error.message || t("consentForm.errorRegistering"),
        variant: "destructive",
      });
    },
  });

  React.useEffect(() => {
    if (client) {
      const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
      if (fullName && fullName !== form.getValues('fullName')) {
        form.setValue('fullName', fullName);
      }
    }
  }, [client, form]);

  React.useEffect(() => {
    const consent = Array.isArray(existingConsent)
      ? existingConsent.find(c => c.clientId === parseInt(clientId))
      : null;

    if (consent && client && !client.hasConsent) {
      apiRequest("PUT", `/api/clients/${clientId}`, {
        ...client,
        hasConsent: true
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      });
    }
  }, [existingConsent, client, clientId]);

  const onSubmit = (data: FormData) => {
    createConsentMutation.mutate(data);
  };

  const consent = Array.isArray(existingConsent)
    ? existingConsent.find(c => c.clientId === parseInt(clientId))
    : null;

  if (isLoadingClient || isLoadingConsent) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t("consentForm.loading")}</span>
      </div>
    );
  }

  if (!client) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("consentForm.errorTitle")}</AlertTitle>
        <AlertDescription>
          {t("consentForm.clientNotFound")}
        </AlertDescription>
      </Alert>
    );
  }

  if (consent) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            {t("consentForm.alreadyRegistered")}
          </CardTitle>
          <CardDescription>
            {t("consentForm.alreadyRegisteredDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">{t("consentForm.detailsHeading")}</h4>
            <div className="space-y-2 text-sm text-green-700">
              <p><strong>{t("consentForm.clientField")}</strong> {client.firstName} {client.lastName}</p>
              <p><strong>{t("consentForm.registrationDateField")}</strong> {new Date(consent.createdAt).toLocaleString(i18n.language)}</p>
              <p><strong>{t("consentForm.signatureField")}</strong> {consent.signature}</p>
              <p><strong>{t("consentForm.statusField")}</strong> {consent.isActive ? t("consentForm.statusActive") : t("consentForm.statusInactive")}</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
            <h4 className="font-semibold text-gray-800 mb-2">{t("consentForm.consentTextLabel")}</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{consent.consentText}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([consent.consentText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${t("consentForm.downloadFilenamePrefix")}_${client.firstName}_${client.lastName}_${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              {t("consentForm.downloadConsent")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{t("consentForm.title")}</CardTitle>
        <CardDescription>
          {t("consentForm.subtitle", { firstName: client.firstName, lastName: client.lastName })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("consentForm.fullNameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("consentForm.fullNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("consentForm.fullNameHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consentText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("consentForm.consentTextField")}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={15}
                      className="text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("consentForm.consentTextHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consentAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t("consentForm.consentAcceptedLabel")}
                    </FormLabel>
                    <FormDescription>
                      {t("consentForm.consentAcceptedHelp")}
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit(onSubmit)();
                }}
                disabled={createConsentMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createConsentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("consentForm.registering")}
                  </>
                ) : (
                  t("consentForm.registerConsent")
                )}
              </Button>
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
