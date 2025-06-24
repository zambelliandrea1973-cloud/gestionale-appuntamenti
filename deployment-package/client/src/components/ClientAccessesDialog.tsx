import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import ClientAccessesDetails from "./ClientAccessesDetails";

interface ClientAccessesDialogProps {
  clientId: number;
  clientName: string;
  open: boolean;
  onClose: () => void;
}

export default function ClientAccessesDialog({
  clientId,
  clientName,
  open,
  onClose
}: ClientAccessesDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">
            {t('clients.accesses.detailsTitle', 'Accessi di {{name}}', { name: clientName })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('clients.accesses.dialogDescription', 'Visualizza i dettagli degli accessi effettuati dal cliente all\'applicazione')}
          </DialogDescription>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="mt-4">
          <ClientAccessesDetails clientId={clientId} showTitle={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
}