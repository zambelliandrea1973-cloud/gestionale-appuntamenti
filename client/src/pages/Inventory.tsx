// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Package, 
  PackagePlus, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Barcode,
  Search,
  Plus,
  Minus,
  ShoppingCart,
  History,
  FileText,
  Lock,
  Image as ImageIcon,
  X,
  Pencil,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useCurrency } from "@/hooks/use-currency";
import { UpgradePrompt } from "@/components/UpgradePrompt";

// Schema factory functions (defined outside component for reuse)
const createCategorySchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('proPages.categoryRequired')),
  description: z.string().optional(),
  color: z.string().default("#3f51b5"),
});

const createProductSchema = (t: (key: string) => string) => z.object({
  categoryId: z.number().optional(),
  name: z.string().min(1, t('proPages.productRequired')),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().min(0, t('proPages.pricePositive')).optional(),
  cost: z.number().min(0, t('proPages.costPositive')).optional(),
  currentStock: z.number().min(0, t('proPages.stockPositive')).optional(),
  minStock: z.number().min(0, t('proPages.minStockPositive')).optional(),
  maxStock: z.number().optional(),
  unit: z.string().default("pz"),
  supplier: z.string().optional(),
  supplierContact: z.string().optional(),
  location: z.string().optional(),
});

const createStockMovementSchema = (t: (key: string) => string) => z.object({
  productId: z.number(),
  movementType: z.enum(["IN", "OUT", "ADJUSTMENT", "SALE", "WASTE"]),
  quantity: z.number().min(1, t('proPages.quantityPositive')),
  unitPrice: z.number().min(0, t('proPages.pricePositive')),
  reason: z.string().optional(),
  reference: z.string().optional(),
  staffMember: z.string().optional(),
  notes: z.string().optional(),
});

const createSaleSchema = (t: (key: string) => string) => z.object({
  productId: z.number(),
  clientId: z.number().optional(),
  quantity: z.number().min(1, t('proPages.quantityPositive')),
  unitPrice: z.number().min(0, t('proPages.pricePositive')),
  discountPercent: z.number().min(0).max(100, t('proPages.maxDiscount')).default(0),
  staffMember: z.string().optional(),
  notes: z.string().optional(),
});

export default function Inventory() {
  const { t } = useTranslation();
  
  // Create translated schemas
  const categorySchema = createCategorySchema(t);
  const productSchema = createProductSchema(t);
  const stockMovementSchema = createStockMovementSchema(t);
  const saleSchema = createSaleSchema(t);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasCapability, getUpgradeMessage } = useCapabilities();
  const { symbol, formatPrice } = useCurrency();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editProductDialogOpen, setEditProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [stockDialogProductId, setStockDialogProductId] = useState<number | null>(null);
  const [saleDialogProductId, setSaleDialogProductId] = useState<number | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);
  const [editProductImagePreview, setEditProductImagePreview] = useState<string | null>(null);
  const [editPriceInput, setEditPriceInput] = useState<string>("");
  const [editCostInput, setEditCostInput] = useState<string>("");
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const editProductImageInputRef = useRef<HTMLInputElement>(null);

  // Verifica accesso a Magazzino (solo BUSINESS)
  const canAccessWarehouse = hasCapability('warehouse');
  const upgradeMessage = getUpgradeMessage('warehouse');
  
  // Fetch data
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory/categories"],
  });
  
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory/products"],
  });
  
  const { data: lowStockProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory/low-stock"],
  });
  
  const { data: recentMovements = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory/movements", { limit: 10 }],
  });
  
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof categorySchema>) => {
      const res = await apiRequest("POST", "/api/inventory/categories", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/categories"] });
      toast({ title: t('proPages.categoryCreated') });
    },
  });
  
  // Handle product image change
  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('proPages.invalidFileType'),
        description: t('proPages.selectImage'),
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('proPages.fileTooLarge'),
        description: t('proPages.maxImageSize'),
        variant: "destructive"
      });
      return;
    }
    
    setProductImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProductImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const removeProductImage = () => {
    setProductImage(null);
    setProductImagePreview(null);
    if (productImageInputRef.current) {
      productImageInputRef.current.value = '';
    }
  };

  // Handle edit product image change
  const handleEditProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('proPages.invalidFileType'),
        description: t('proPages.selectImage'),
        variant: "destructive"
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('proPages.fileTooLarge'),
        description: t('proPages.maxImageSize'),
        variant: "destructive"
      });
      return;
    }
    
    setEditProductImage(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditProductImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const removeEditProductImage = () => {
    setEditProductImage(null);
    setEditProductImagePreview(null);
    if (editProductImageInputRef.current) {
      editProductImageInputRef.current.value = '';
    }
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productSchema>) => {
      const res = await apiRequest("POST", "/api/inventory/products", data);
      return res.json();
    },
    onSuccess: async (createdProduct) => {
      // Upload image if present
      if (productImage && createdProduct.id) {
        try {
          const formData = new FormData();
          formData.append('image', productImage);
          
          await fetch(`/api/inventory/products/${createdProduct.id}/upload-image`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
        } catch (error) {
          console.error("Image upload error:", error);
          toast({
            title: t('proPages.productCreatedImageError'),
            description: t('proPages.canAddImageLater'),
            variant: "destructive"
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({ title: t('inventory.toast.created') });
      productForm.reset();
      removeProductImage();
      setProductDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Product creation error:", error);
      toast({ 
        title: t('proPages.productCreateError'), 
        description: error.message || t('proPages.unknownError'),
        variant: "destructive"
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/inventory/products/${id}`, data);
      return res.json();
    },
    onSuccess: async (updatedProduct) => {
      // Upload new image if present
      if (editProductImage && updatedProduct.id) {
        try {
          const formData = new FormData();
          formData.append('image', editProductImage);
          
          await fetch(`/api/inventory/products/${updatedProduct.id}/upload-image`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
        } catch (error) {
          console.error("Image upload error:", error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({ title: t('inventory.toast.updated') });
      setEditProductDialogOpen(false);
      setEditingProduct(null);
      removeEditProductImage();
    },
    onError: (error: any) => {
      toast({ 
        title: t('proPages.productUpdateError'), 
        description: error.message || t('proPages.unknownError'),
        variant: "destructive"
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/inventory/products/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      toast({ title: t('inventory.toast.deleted') });
    },
    onError: (error: any) => {
      toast({ 
        title: t('proPages.productDeleteError'), 
        description: error.message || t('proPages.unknownError'),
        variant: "destructive"
      });
    },
  });
  
  const addStockMutation = useMutation({
    mutationFn: async (data: z.infer<typeof stockMovementSchema>) => {
      const res = await apiRequest("POST", "/api/inventory/movements", data);
      return res.json();
    },
    onSuccess: async () => {
      // Invalida E forza il refetch immediato di tutte le query correlate
      await queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"], refetchType: 'active' });
      
      // Refetch esplicito per garantire l'aggiornamento immediato
      await queryClient.refetchQueries({ queryKey: ["/api/inventory/low-stock"] });
      await queryClient.refetchQueries({ queryKey: ["/api/inventory/products"] });
      
      // Chiudi il dialog e resetta il form
      setStockDialogProductId(null);
      movementForm.reset();
      
      toast({ title: t('inventory.toast.stockUpdated') });
    },
    onError: (error: any) => {
      toast({
        title: t('inventory.toast.error'),
        description: error.message || t('proPages.unknownError'),
        variant: "destructive"
      });
    },
  });
  
  const recordSaleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof saleSchema>) => {
      const res = await apiRequest("POST", "/api/inventory/sales", data);
      return res.json();
    },
    onSuccess: async () => {
      // Invalida E forza il refetch immediato di tutte le query correlate
      await queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"], refetchType: 'active' });
      
      // Refetch esplicito per garantire l'aggiornamento immediato
      await queryClient.refetchQueries({ queryKey: ["/api/inventory/low-stock"] });
      await queryClient.refetchQueries({ queryKey: ["/api/inventory/products"] });
      
      // Chiudi il dialog e resetta il form
      setSaleDialogProductId(null);
      saleForm.reset();
      
      toast({ title: t('inventory.toast.saleRecorded') });
    },
  });

  // Forms
  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "", color: "#3f51b5" },
  });
  
  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      barcode: "",
      price: undefined,
      cost: undefined,
      currentStock: undefined,
      minStock: undefined,
      maxStock: undefined,
      unit: "pz",
      supplier: "",
      supplierContact: "",
      location: "",
    },
  });

  const editProductForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema.partial()),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      barcode: "",
      price: undefined,
      cost: undefined,
      currentStock: undefined,
      minStock: undefined,
      maxStock: undefined,
      unit: "pz",
      supplier: "",
      supplierContact: "",
      location: "",
    },
  });
  
  const movementForm = useForm<z.infer<typeof stockMovementSchema>>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      movementType: "IN",
      quantity: 1,
      unitPrice: 0,
    },
  });
  
  const saleForm = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
    },
  });

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.categoryId?.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (product) => {
    if (product.currentStock <= 0) return { status: "out", color: "destructive", text: t('inventory.outOfStock') };
    if (product.currentStock <= product.minStock) return { status: "low", color: "warning", text: t('inventory.lowStock') };
    return { status: "ok", color: "success", text: t('inventory.available') };
  };

  // Se non ha accesso al Magazzino, mostra UI bloccata
  if (!canAccessWarehouse) {
    return (
      <>
        <div className="container mx-auto py-6 space-y-6">
          <Card className="border-2 border-orange-200 bg-orange-50/50">
            <CardContent className="text-center py-12">
              <Lock className="h-16 w-16 mx-auto text-orange-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('inventory.locked.title')}</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {t('inventory.locked.description')} <span className="font-bold text-orange-700">{t('inventory.locked.businessPlan')}</span>.
              </p>
              <Button 
                onClick={() => setShowUpgradePrompt(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                data-testid="button-upgrade-warehouse"
              >
                {t('inventory.locked.upgradeToBusiness')}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <UpgradePrompt
          open={showUpgradePrompt}
          onOpenChange={setShowUpgradePrompt}
          title={upgradeMessage.title}
          description={upgradeMessage.description}
          requiredPlan={upgradeMessage.requiredPlan}
        />
      </>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">{t('inventory.title')}</h1>
        <div className="flex gap-2">
          <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PackagePlus className="mr-2 h-4 w-4" />
                {t('inventory.newProduct')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('inventory.addNewProduct')}</DialogTitle>
              </DialogHeader>
              <Form {...productForm}>
                <form onSubmit={productForm.handleSubmit((data) => {
                  console.log("Form data before cleanup:", data);
                  console.log("categoryId in form:", data.categoryId, "type:", typeof data.categoryId);
                  // Pulisci i dati rimuovendo solo campi undefined, null o stringhe vuote
                  // Mantieni i numeri anche se sono 0
                  const cleanData = Object.fromEntries(
                    Object.entries(data).filter(([_, v]) => {
                      if (typeof v === 'number') return true; // Mantieni tutti i numeri
                      return v !== undefined && v !== null && v !== "";
                    })
                  );
                  console.log("Form data after cleanup:", cleanData);
                  console.log("categoryId after cleanup:", cleanData.categoryId);
                  createProductMutation.mutate(cleanData);
                })} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={productForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.form.name')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.form.category')}</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder={categories.length === 0 ? t('inventory.form.noCategories') : t('inventory.form.selectCategory')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">
                                  {t('inventory.form.createCategoryFirst')}
                                </div>
                              ) : (
                                categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Product Image Upload */}
                  <div className="space-y-2">
                    <Label>{t('inventory.form.image')}</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        ref={productImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageChange}
                        className="hidden"
                        id="product-image-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => productImageInputRef.current?.click()}
                        data-testid="button-upload-product-image"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        {productImage ? t('inventory.form.changeImage') : t('inventory.form.uploadImage')}
                      </Button>
                      {productImage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeProductImage}
                          data-testid="button-remove-product-image"
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t('i18nFinale.inventoryExtra.removeImage')}
                        </Button>
                      )}
                    </div>
                    {productImagePreview && (
                      <div className="mt-2">
                        <img
                          src={productImagePreview}
                          alt="Anteprima prodotto"
                          className="w-32 h-32 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={productForm.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.sku')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.barcode')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('i18nFinale.inventory.unitOfMeasure')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pz">Pezzi</SelectItem>
                              <SelectItem value="kg">Kilogrammi</SelectItem>
                              <SelectItem value="l">Litri</SelectItem>
                              <SelectItem value="ml">Millilitri</SelectItem>
                              <SelectItem value="g">Grammi</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={productForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.form.price')} ({symbol})</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...field} 
                              value={field.value ? field.value / 100 : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? undefined : Math.round((parseFloat(value) || 0) * 100));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.form.costPrice')} ({symbol})</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...field} 
                              value={field.value ? field.value / 100 : ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? undefined : Math.round((parseFloat(value) || 0) * 100));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={productForm.control}
                      name="currentStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scorte Attuali</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? undefined : parseInt(value) || undefined);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="minStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scorte Minime</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? undefined : parseInt(value) || undefined);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="maxStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scorte Massime</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? undefined : parseInt(value) || undefined);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={productForm.control}
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.form.supplier')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.form.location')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={productForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('inventory.form.description')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={createProductMutation.isPending}>
                    {createProductMutation.isPending ? t('inventory.saving') : t('inventory.newProduct')}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          {/* Edit Product Dialog */}
          <Dialog open={editProductDialogOpen} onOpenChange={setEditProductDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('inventory.editProduct')}: {editingProduct?.name}</DialogTitle>
              </DialogHeader>
              <Form {...editProductForm}>
                <form onSubmit={editProductForm.handleSubmit((data) => {
                  const cleanData = Object.fromEntries(
                    Object.entries(data).filter(([_, v]) => {
                      if (typeof v === 'number') return true;
                      return v !== undefined && v !== null && v !== "";
                    })
                  );
                  updateProductMutation.mutate({ id: editingProduct.id, data: cleanData });
                })} className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editProductForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.form.name')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editProductForm.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.form.category')}</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('inventory.form.selectCategory')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Edit Product Image Upload */}
                  <div className="space-y-2">
                    <Label>{t('inventory.form.image')}</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        ref={editProductImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleEditProductImageChange}
                        className="hidden"
                        id="edit-product-image-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => editProductImageInputRef.current?.click()}
                        data-testid="button-edit-upload-product-image"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        {editProductImage ? t('inventory.form.changeImage') : editProductImagePreview ? t('inventory.form.changeImage') : t('inventory.form.uploadImage')}
                      </Button>
                      {(editProductImage || editProductImagePreview) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeEditProductImage}
                          data-testid="button-edit-remove-product-image"
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t('i18nFinale.inventoryExtra.removeImage')}
                        </Button>
                      )}
                    </div>
                    {editProductImagePreview && (
                      <div className="mt-2">
                        <img
                          src={editProductImagePreview}
                          alt="Anteprima prodotto"
                          className="w-32 h-32 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editProductForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.form.price')} ({symbol})</FormLabel>
                          <FormControl>
                            <Input 
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={editPriceInput}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEditPriceInput(value);
                                
                                if (value === "" || value === ".") {
                                  field.onChange(undefined);
                                } else {
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue)) {
                                    field.onChange(Math.round(numValue * 100));
                                  }
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editProductForm.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('inventory.form.costPrice')} ({symbol})</FormLabel>
                          <FormControl>
                            <Input 
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={editCostInput}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEditCostInput(value);
                                
                                if (value === "" || value === ".") {
                                  field.onChange(undefined);
                                } else {
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue)) {
                                    field.onChange(Math.round(numValue * 100));
                                  }
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={updateProductMutation.isPending}>
                    {updateProductMutation.isPending ? t('inventory.saving') : t('inventory.saveChanges')}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.dashboard.totalProducts')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.dashboard.lowStock')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockProducts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.dashboard.warehouseValue')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(products.reduce((total, product) => total + (product.currentStock * (product.cost || 0)), 0))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory.dashboard.categories')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts for low stock */}
      {lowStockProducts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              {t('inventory.alert.lowStockAlert')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded">
                  <span className="font-medium">{product.name}</span>
                  <Badge variant="destructive">
                    {product.currentStock} {product.unit} (min: {product.minStock})
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">{t('inventory.tabs.products')}</TabsTrigger>
          <TabsTrigger value="movements">{t('inventory.tabs.movements')}</TabsTrigger>
          <TabsTrigger value="sales">{t('inventory.tabs.sales')}</TabsTrigger>
          <TabsTrigger value="categories">{t('inventory.tabs.categories')}</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('inventory.search.placeholder')}
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.search.allCategories')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              return (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                      </div>
                      <Badge variant={stockStatus.color}>{stockStatus.text}</Badge>
                    </div>
                  </CardHeader>
                  
                  {/* Product Image */}
                  <div className="px-6 pb-3">
                    {product.imagePath ? (
                      <img
                        src={product.imagePath.startsWith('/') ? product.imagePath : `/${product.imagePath}`}
                        alt={product.name}
                        className="w-full h-40 object-cover rounded-lg border"
                        data-testid={`img-product-${product.id}`}
                      />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center bg-muted rounded-lg border">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>{t('inventory.stock')}: <strong>{product.currentStock} {product.unit}</strong></div>
                      <div>{t('inventory.price')}: <strong>{formatPrice(product.price)}</strong></div>
                      <div>{t('inventory.cost')}: <strong>{formatPrice(product.cost)}</strong></div>
                      <div>{t('inventory.min')}: <strong>{product.minStock} {product.unit}</strong></div>
                    </div>
                    
                    {product.location && (
                      <p className="text-sm text-muted-foreground">📍 {product.location}</p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex gap-2 justify-center">
                        <Dialog open={stockDialogProductId === product.id} onOpenChange={(open) => setStockDialogProductId(open ? product.id : null)}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                // Precompila il form con il costo del prodotto
                                movementForm.reset({
                                  productId: product.id,
                                  quantity: 1,
                                  unitPrice: product.cost || 0,
                                  reference: "",
                                  movementType: "IN"
                                });
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {t('inventory.stock.load')}
                            </Button>
                          </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('inventory.stock.loadGoods')} - {product.name}</DialogTitle>
                          </DialogHeader>
                          <Form {...movementForm}>
                            <form onSubmit={movementForm.handleSubmit(
                              (data) => {
                                addStockMutation.mutate(data, {
                                  onSuccess: () => {
                                    setStockDialogProductId(null);
                                    movementForm.reset();
                                  }
                                });
                              },
                              (errors) => {
                                toast({
                                  title: t('inventory.formError'),
                                  description: t('inventory.checkFields'),
                                  variant: "destructive"
                                });
                              }
                            )}>
                              <div className="space-y-4">
                                <FormField
                                  control={movementForm.control}
                                  name="quantity"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t('inventory.form.quantity')}</FormLabel>
                                      <FormControl>
                                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={movementForm.control}
                                  name="unitPrice"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t('inventory.stock.unitPrice')} ({symbol})</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="number" 
                                          step="0.01" 
                                          value={(field.value || 0) / 100}
                                          onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={movementForm.control}
                                  name="reference"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t('inventory.stock.reference')}</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit" className="w-full" disabled={addStockMutation.isPending}>
                                  {addStockMutation.isPending ? t('inventory.saving') : t('inventory.stock.registerLoad')}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                        </Dialog>
                        
                        <Dialog open={saleDialogProductId === product.id} onOpenChange={(open) => setSaleDialogProductId(open ? product.id : null)}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                saleForm.reset({
                                  productId: product.id,
                                  quantity: 1,
                                  unitPrice: product.price || 0,
                                  discountPercent: 0,
                                  clientId: undefined
                                });
                              }}
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              {t('inventory.stock.sell')}
                            </Button>
                          </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('inventory.stock.registerSale')} - {product.name}</DialogTitle>
                          </DialogHeader>
                          <Form {...saleForm}>
                            <form onSubmit={saleForm.handleSubmit(
                              (data) => {
                                const totalAmount = data.unitPrice * data.quantity;
                                const finalAmount = Math.round(totalAmount * (1 - data.discountPercent / 100));
                                
                                recordSaleMutation.mutate({
                                  ...data,
                                  discountPercent: data.discountPercent.toString(),
                                  totalAmount,
                                  finalAmount
                                }, {
                                  onSuccess: () => {
                                    setSaleDialogProductId(null);
                                    saleForm.reset();
                                  }
                                });
                              },
                              (errors) => {
                                toast({
                                  title: t('inventory.formError'),
                                  description: t('inventory.checkFields'),
                                  variant: "destructive"
                                });
                              }
                            )}>
                              <div className="space-y-4">
                                <FormField
                                  control={saleForm.control}
                                  name="clientId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t('inventory.sale.clientOptional')}</FormLabel>
                                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder={t('inventory.sale.selectClient')} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id.toString()}>
                                              {client.firstName} {client.lastName}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={saleForm.control}
                                  name="quantity"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t('inventory.form.quantity')}</FormLabel>
                                      <FormControl>
                                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={saleForm.control}
                                  name="unitPrice"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t('inventory.stock.unitPrice')} ({symbol})</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="number" 
                                          step="0.01" 
                                          value={(field.value || 0) / 100}
                                          onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={saleForm.control}
                                  name="discountPercent"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{t('inventory.sale.discount')}</FormLabel>
                                      <FormControl>
                                        <Input type="number" min="0" max="100" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value || "0"))} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit" className="w-full" disabled={recordSaleMutation.isPending}>
                                  {recordSaleMutation.isPending ? t('inventory.saving') : t('inventory.stock.registerSaleBtn')}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                        </Dialog>
                      </div>
                      
                      <div className="flex gap-2 justify-center">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setEditingProduct(product);
                            editProductForm.reset({
                              ...product,
                              price: product.price,
                              cost: product.cost,
                            });
                            
                            // Set price and cost input values
                            setEditPriceInput(product.price ? (product.price / 100).toString() : "");
                            setEditCostInput(product.cost ? (product.cost / 100).toString() : "");
                            
                            // Set existing image preview if product has image
                            if (product.imagePath) {
                              const imagePath = product.imagePath.startsWith('/') ? product.imagePath : `/${product.imagePath}`;
                              setEditProductImagePreview(imagePath);
                            } else {
                              setEditProductImagePreview(null);
                            }
                            setEditProductImage(null);
                            setEditProductDialogOpen(true);
                          }}
                          data-testid={`button-edit-product-${product.id}`}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          {t('inventory.edit')}
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              data-testid={`button-delete-product-${product.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-1 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('inventory.confirmDelete')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('inventory.confirmDeleteDesc')} "{product.name}"? {t('inventory.cannotUndo')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('inventory.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProductMutation.mutate(product.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t('inventory.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.movements.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      {movement.movementType === "IN" ? 
                        <TrendingUp className="h-4 w-4 text-green-500" /> : 
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      }
                      <div>
                        <p className="font-medium">{movement.product?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {movement.movementType} - {movement.quantity} {movement.product?.unit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(movement.totalValue)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(movement.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.sales.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('inventory.sales.inDevelopment')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('inventory.categories.title')}</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('inventory.categories.newCategory')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('inventory.categories.addNewCategory')}</DialogTitle>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit((data) => createCategoryMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('inventory.categories.name')}</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('inventory.form.description')}</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('inventory.categories.color')}</FormLabel>
                              <FormControl>
                                <Input type="color" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full">
                          {t('inventory.categories.create')}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <Card key={category.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded mr-2" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                      <p className="text-sm font-medium mt-2">
                        {products.filter(p => p.categoryId === category.id).length} {t('inventory.tabs.products').toLowerCase()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}