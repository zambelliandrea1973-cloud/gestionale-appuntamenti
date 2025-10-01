import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requiredPlan: string;
}

export function UpgradePrompt({
  open,
  onOpenChange,
  title,
  description,
  requiredPlan,
}: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  const handleUpgrade = () => {
    setLocation('/subscription');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">
              Piano richiesto: <span className="text-primary font-bold">{requiredPlan}</span>
            </p>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleUpgrade}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            Vedi Piani
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
