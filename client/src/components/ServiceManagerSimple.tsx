import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Pencil, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import { apiRequest } from "@/lib/queryClient";

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  color?: string;
  description?: string;
  isDefault?: boolean;
  ownerId?: number;
}

interface ServiceFormData {
  id?: number;
  name: string;
  duration: number | string;
  price: number | string;
  color?: string;
  description?: string;
}

export default function ServiceManagerSimple() {
  const { t } = useTranslation();
  const { user } = useUserWithLicense();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    duration: 30,
    price: 50,
    color: "#3b82f6",
    description: "",
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!user?.id,
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await apiRequest("POST", "/api/services", {
        name: data.name,
        duration: Number(data.duration),
        price: Number(data.price),
        color: data.color || "#3b82f6",
        description: data.description || "",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: t("serviceManagerSimple.toast.successTitle"),
        description: t("serviceManagerSimple.toast.created"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("serviceManagerSimple.toast.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await apiRequest("PUT", `/api/services/${data.id}`, {
        name: data.name,
        duration: Number(data.duration),
        price: Number(data.price),
        color: data.color || "#3b82f6",
        description: data.description || "",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: t("serviceManagerSimple.toast.successTitle"),
        description: t("serviceManagerSimple.toast.updated"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("serviceManagerSimple.toast.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: t("serviceManagerSimple.toast.successTitle"),
        description: t("serviceManagerSimple.toast.deleted"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("serviceManagerSimple.toast.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditService = (service: Service) => {
    setFormData({
      id: service.id,
      name: service.name,
      duration: service.duration,
      price: service.price,
      color: service.color || "#3b82f6",
      description: service.description || "",
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteService = (id: number) => {
    if (window.confirm(t("serviceManagerSimple.confirm.delete"))) {
      deleteServiceMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      duration: 30,
      price: 50,
      color: "#3b82f6",
      description: "",
    });
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: t("serviceManagerSimple.toast.errorTitle"),
        description: t("serviceManagerSimple.validation.nameRequired"),
        variant: "destructive",
      });
      return;
    }

    if (Number(formData.duration) <= 0) {
      toast({
        title: t("serviceManagerSimple.toast.errorTitle"),
        description: t("serviceManagerSimple.validation.durationPositive"),
        variant: "destructive",
      });
      return;
    }

    if (Number(formData.price) < 0) {
      toast({
        title: t("serviceManagerSimple.toast.errorTitle"),
        description: t("serviceManagerSimple.validation.priceNonNegative"),
        variant: "destructive",
      });
      return;
    }

    if (isEditing) {
      updateServiceMutation.mutate(formData);
    } else {
      createServiceMutation.mutate(formData);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes} min`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("serviceManagerSimple.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("serviceManagerSimple.description")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("serviceManagerSimple.availableServices")}</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                {t("serviceManagerSimple.newService")}
              </Button>
            </DialogTrigger>
            <DialogContent className="min-[1200px]:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? t("serviceManagerSimple.editService") : t("serviceManagerSimple.newService")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("serviceManagerSimple.fields.name")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t("serviceManagerSimple.fields.namePlaceholder")}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">{t("serviceManagerSimple.fields.duration")}</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      min="15"
                      step="15"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">{t("serviceManagerSimple.fields.price")}</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">{t("serviceManagerSimple.fields.color")}</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("serviceManagerSimple.fields.description")}</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t("serviceManagerSimple.fields.descriptionPlaceholder")}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t("serviceManagerSimple.actions.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                  >
                    {isEditing ? t("serviceManagerSimple.actions.update") : t("serviceManagerSimple.actions.create")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("serviceManagerSimple.table.name")}</TableHead>
                <TableHead>{t("serviceManagerSimple.table.duration")}</TableHead>
                <TableHead>{t("serviceManagerSimple.table.price")}</TableHead>
                <TableHead>{t("serviceManagerSimple.table.color")}</TableHead>
                <TableHead className="text-right">{t("serviceManagerSimple.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service: Service, index: number) => (
                <TableRow key={`row-${index}-${service.name.replace(/\s+/g, '-')}`}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{formatDuration(service.duration)}</TableCell>
                  <TableCell>{formatPrice(service.price)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: service.color || "#3b82f6" }}
                      ></div>
                      <span className="text-xs text-muted-foreground">
                        {service.color || "#3b82f6"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditService(service)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {services.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <p>{t("serviceManagerSimple.empty.title")}</p>
              <p className="text-sm">{t("serviceManagerSimple.empty.hint")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
