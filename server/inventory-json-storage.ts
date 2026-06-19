import { Product, ProductCategory, StockMovement, ProductSale, InsertProduct, InsertProductCategory, InsertStockMovement, InsertProductSale } from '../shared/schema';
import { loadStorageData, saveStorageData } from './utils/jsonStorage.js';

export class InventoryJsonStorage {
  // Product Categories
  async getProductCategories(userId: number): Promise<ProductCategory[]> {
    try {
      const data = loadStorageData();
      const categories = data.productCategories || [];
      
      return categories
        .map(([id, cat]: any) => cat)
        .filter((cat: any) => cat.userId === userId)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error getting product categories:", error);
      return [];
    }
  }

  async getProductCategory(id: number, userId: number): Promise<ProductCategory | undefined> {
    try {
      const data = loadStorageData();
      const categories = data.productCategories || [];
      
      const found = categories.find(([catId, cat]: any) => cat.id === id && cat.userId === userId);
      return found ? found[1] : undefined;
    } catch (error) {
      console.error("Error getting product category:", error);
      return undefined;
    }
  }

  async createProductCategory(category: InsertProductCategory & { userId: number }): Promise<ProductCategory> {
    try {
      const data = loadStorageData();
      
      if (!data.productCategories) data.productCategories = [];
      
      // Initialize counter: find valid max ID or start from 1
      if (!data.categoryNextId) {
        const validIds = data.productCategories
          .map(([id]: any) => id)
          .filter((id: any) => id < 2147483647); // Ignora ID troppo grandi
        data.categoryNextId = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
      }
      
      // Simple auto-increment counter
      const newId = data.categoryNextId;
      data.categoryNextId = newId + 1;
      
      const newCategory = {
        ...category,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      data.productCategories.push([newId, newCategory]);
      saveStorageData(data);
      
      return newCategory as unknown as unknown as ProductCategory;
    } catch (error) {
      console.error("Error creating product category:", error);
      throw error;
    }
  }

  async updateProductCategory(id: number, userId: number, category: Partial<InsertProductCategory>): Promise<ProductCategory | undefined> {
    try {
      const data = loadStorageData();
      
      if (!data.productCategories) return undefined;
      
      const index = data.productCategories.findIndex(([catId, cat]: any) => cat.id === id && cat.userId === userId);
      if (index === -1) return undefined;
      
      data.productCategories[index][1] = {
        ...data.productCategories[index][1],
        ...category,
        updatedAt: new Date().toISOString(),
      };
      
      saveStorageData(data);
      return data.productCategories[index][1] as unknown as unknown as ProductCategory;
    } catch (error) {
      console.error("Error updating product category:", error);
      return undefined;
    }
  }

  async deleteProductCategory(id: number, userId: number): Promise<boolean> {
    try {
      const data = loadStorageData();
      
      if (!data.productCategories) return false;
      
      const initialLength = data.productCategories.length;
      data.productCategories = data.productCategories.filter(([catId, cat]: any) => !(cat.id === id && cat.userId === userId));
      
      if (data.productCategories.length < initialLength) {
        saveStorageData(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting product category:", error);
      return false;
    }
  }

  // Products
  async getProducts(userId: number): Promise<Product[]> {
    try {
      const data = loadStorageData();
      const productsList = data.products || [];
      
      return productsList
        .map(([id, prod]: any) => prod)
        .filter((prod: any) => prod.userId === userId)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }

  async getProduct(id: number, userId: number): Promise<Product | undefined> {
    try {
      const data = loadStorageData();
      const productsList = data.products || [];
      
      const found = productsList.find(([prodId, prod]: any) => prod.id === id && prod.userId === userId);
      return found ? found[1] : undefined;
    } catch (error) {
      console.error("Error getting product:", error);
      return undefined;
    }
  }

  async createProduct(product: InsertProduct & { userId: number }): Promise<Product> {
    try {
      const data = loadStorageData();
      
      if (!data.products) data.products = [];
      
      // Initialize counter: find valid max ID or start from 1
      if (!data.productNextId) {
        const validIds = data.products
          .map(([id]: any) => id)
          .filter((id: any) => id < 2147483647); // Ignora ID troppo grandi
        data.productNextId = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
      }
      
      // Simple auto-increment counter
      const newId = data.productNextId;
      data.productNextId = newId + 1;
      
      const newProduct = {
        ...product,
        id: newId,
        currentStock: product.currentStock || 0,
        minStock: product.minStock || 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      data.products.push([newId, newProduct]);
      saveStorageData(data);
      
      return newProduct as unknown as Product;
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async updateProduct(id: number, userId: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    try {
      const data = loadStorageData();
      
      if (!data.products) return undefined;
      
      const index = data.products.findIndex(([prodId, prod]: any) => prod.id === id && prod.userId === userId);
      if (index === -1) return undefined;
      
      data.products[index][1] = {
        ...data.products[index][1],
        ...product,
        updatedAt: new Date().toISOString(),
      };
      
      saveStorageData(data);
      return data.products[index][1] as unknown as Product;
    } catch (error) {
      console.error("Error updating product:", error);
      return undefined;
    }
  }

  async deleteProduct(id: number, userId: number): Promise<boolean> {
    try {
      const data = loadStorageData();
      
      if (!data.products) return false;
      
      const initialLength = data.products.length;
      data.products = data.products.filter(([prodId, prod]: any) => !(prod.id === id && prod.userId === userId));
      
      if (data.products.length < initialLength) {
        saveStorageData(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting product:", error);
      return false;
    }
  }

  async getLowStockProducts(userId: number): Promise<Product[]> {
    try {
      const data = loadStorageData();
      const productsList = data.products || [];
      
      return productsList
        .map(([id, prod]: any) => prod)
        .filter((prod: any) => prod.userId === userId && (prod.currentStock || 0) <= (prod.minStock || 0))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error getting low stock products:", error);
      return [];
    }
  }

  // Stock Movements
  async getStockMovements(userId: number, limit?: number): Promise<StockMovement[]> {
    try {
      const data = loadStorageData();
      const movements = data.stockMovements || [];
      
      let filtered = movements
        .map(([id, mov]: any) => mov)
        .filter((mov: any) => mov.userId === userId)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (limit) {
        filtered = filtered.slice(0, limit);
      }
      
      return filtered;
    } catch (error) {
      console.error("Error getting stock movements:", error);
      return [];
    }
  }

  async createStockMovement(movement: InsertStockMovement & { userId: number }): Promise<StockMovement> {
    try {
      const data = loadStorageData();
      
      if (!data.stockMovements) data.stockMovements = [];
      if (!data.products) data.products = [];
      
      // Initialize counter: find valid max ID or start from 1
      if (!data.movementNextId) {
        const validIds = data.stockMovements
          .map(([id]: any) => id)
          .filter((id: any) => id < 2147483647);
        data.movementNextId = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
      }
      
      // Simple auto-increment counter
      const newId = data.movementNextId;
      data.movementNextId = newId + 1;
      
      const newMovement = {
        ...movement,
        id: newId,
        createdAt: new Date().toISOString(),
      };
      
      data.stockMovements.push([newId, newMovement]);
      
      // Update product stock
      const productIndex = data.products.findIndex(([id, prod]: any) => prod.id === movement.productId && prod.userId === movement.userId);
      if (productIndex !== -1) {
        const product = data.products[productIndex][1];
        const currentStock = product.currentStock || 0;
        
        if (movement.movementType === 'IN') {
          product.currentStock = currentStock + movement.quantity;
        } else if (movement.movementType === 'OUT' || movement.movementType === 'SALE' || movement.movementType === 'WASTE') {
          product.currentStock = Math.max(0, currentStock - movement.quantity);
        } else if (movement.movementType === 'ADJUSTMENT') {
          product.currentStock = movement.quantity;
        }
        
        product.updatedAt = new Date().toISOString();
      }
      
      saveStorageData(data);
      
      return newMovement as unknown as StockMovement;
    } catch (error) {
      console.error("Error creating stock movement:", error);
      throw error;
    }
  }

  async getProductStockHistory(productId: number, userId: number): Promise<StockMovement[]> {
    try {
      const data = loadStorageData();
      const movements = data.stockMovements || [];
      
      return movements
        .map(([id, mov]: any) => mov)
        .filter((mov: any) => mov.productId === productId && mov.userId === userId)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting product stock history:", error);
      return [];
    }
  }

  // Product Sales
  async getProductSales(userId: number, limit?: number): Promise<ProductSale[]> {
    try {
      const data = loadStorageData();
      const sales = data.productSales || [];
      
      let filtered = sales
        .map(([id, sale]: any) => sale)
        .filter((sale: any) => sale.userId === userId)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (limit) {
        filtered = filtered.slice(0, limit);
      }
      
      return filtered;
    } catch (error) {
      console.error("Error getting product sales:", error);
      return [];
    }
  }

  async createProductSale(sale: InsertProductSale & { userId: number }): Promise<ProductSale> {
    try {
      const data = loadStorageData();
      
      if (!data.productSales) data.productSales = [];
      
      // Initialize counter: find valid max ID or start from 1
      if (!data.saleNextId) {
        const validIds = data.productSales
          .map(([id]: any) => id)
          .filter((id: any) => id < 2147483647);
        data.saleNextId = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
      }
      
      // Simple auto-increment counter
      const newId = data.saleNextId;
      data.saleNextId = newId + 1;
      
      const newSale = {
        ...sale,
        id: newId,
        createdAt: new Date().toISOString(),
      };
      
      data.productSales.push([newId, newSale]);
      
      // Create a stock movement for the sale
      await this.createStockMovement({
        userId: sale.userId,
        productId: sale.productId,
        movementType: 'SALE',
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
        reason: 'Product sale',
        reference: `Sale #${newId}`,
        staffMember: sale.staffMember,
        notes: sale.notes
      });
      
      return newSale as unknown as unknown as ProductSale;
    } catch (error) {
      console.error("Error creating product sale:", error);
      throw error;
    }
  }

  async getProductSalesHistory(productId: number, userId: number): Promise<ProductSale[]> {
    try {
      const data = loadStorageData();
      const sales = data.productSales || [];
      
      return sales
        .map(([id, sale]: any) => sale)
        .filter((sale: any) => sale.productId === productId && sale.userId === userId)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting product sales history:", error);
      return [];
    }
  }

  // ─── EV Cosmetics Orders ──────────────────────────────────────────────────

  async createEvOrder(order: {
    professionalId: number;
    professionalName?: string;
    professionalEmail?: string;
    items: Array<{ code: string; name: string; format: string; qty: number; unitPrice: number; proPrice: number; discountPct: number }>;
    totalQty: number; totalPublic: number; totalPro: number; saving: number; notes?: string;
  }): Promise<any> {
    try {
      const data = loadStorageData();
      if (!data.evOrders) data.evOrders = [];
      if (!data.evOrderNextSeq) {
        const maxSeq = data.evOrders.reduce((m: number, o: any) => {
          const n = parseInt((o.id || '').replace('EV-', '')) || 0;
          return n > m ? n : m;
        }, 2000);
        data.evOrderNextSeq = maxSeq + 1;
      }
      const seq = data.evOrderNextSeq;
      data.evOrderNextSeq = seq + 1;
      const newOrder = {
        ...order,
        id: `EV-${seq}`,
        status: 'pending',
        stockLoaded: false,
        createdAt: new Date().toISOString(),
      };
      data.evOrders.push(newOrder);
      saveStorageData(data);
      return newOrder;
    } catch (error) {
      console.error("Error creating EV order:", error);
      throw error;
    }
  }

  async getEvOrders(): Promise<any[]> {
    try {
      const data = loadStorageData();
      return (data.evOrders || []).sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error("Error getting EV orders:", error);
      return [];
    }
  }

  async getEvOrdersByProfessional(professionalId: number): Promise<any[]> {
    try {
      const data = loadStorageData();
      return (data.evOrders || [])
        .filter((o: any) => o.professionalId === professionalId)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting EV orders by professional:", error);
      return [];
    }
  }

  async updateEvOrder(orderId: string, updates: Partial<any>): Promise<any | null> {
    try {
      const data = loadStorageData();
      if (!data.evOrders) return null;
      const idx = data.evOrders.findIndex((o: any) => o.id === orderId);
      if (idx === -1) return null;
      data.evOrders[idx] = { ...data.evOrders[idx], ...updates };
      saveStorageData(data);
      return data.evOrders[idx];
    } catch (error) {
      console.error("Error updating EV order:", error);
      throw error;
    }
  }

  // ─── EV Settings (Stripe key, commission rate, IBAN) ─────────────────────

  async getEvSettings(): Promise<any> {
    try {
      const data = loadStorageData();
      return data.evSettings || {
        stripeSecretKey: '',
        stripePublicKey: '',
        platformCommissionPct: 2,
        ibanEv: '',
        ibanHolder: '',
        bankName: '',
        paymentMethods: ['stripe', 'transfer'],
        orderEmailEnabled: true,
        shipEmailEnabled: true,
      };
    } catch (error) {
      console.error('Error getting EV settings:', error);
      return {};
    }
  }

  async saveEvSettings(settings: any): Promise<any> {
    try {
      const data = loadStorageData();
      data.evSettings = { ...(data.evSettings || {}), ...settings };
      saveStorageData(data);
      return data.evSettings;
    } catch (error) {
      console.error('Error saving EV settings:', error);
      throw error;
    }
  }

  // ─── EV Reports ──────────────────────────────────────────────────────────

  async getEvReports(period: 'day'|'week'|'month'|'year' = 'month'): Promise<any> {
    try {
      const data = loadStorageData();
      const now = new Date();

      // Compute period start boundary
      let periodStart: Date;
      if (period === 'day') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week') {
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - 6);
        periodStart.setHours(0, 0, 0, 0);
      } else if (period === 'month') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        periodStart = new Date(now.getFullYear(), 0, 1);
      }

      const allOrders: any[] = (data.evOrders || []).filter((o: any) => o.status !== 'rejected');
      const orders = allOrders.filter((o: any) => {
        if (!o.createdAt) return false;
        return new Date(o.createdAt) >= periodStart;
      });

      const settings = data.evSettings || {};
      const commPct: number = settings.platformCommissionPct ?? 2;

      const byProfessional: Record<string, { name: string; email: string; orders: number; revenue: number; qty: number }> = {};
      const byProduct: Record<string, { name: string; cat: string; orders: number; revenue: number; qty: number }> = {};
      const byCategory: Record<string, { name: string; revenue: number; qty: number }> = {};
      const byTime: Record<string, { label: string; revenue: number; orders: number; commission: number }> = {};

      // Build all time slots for selected period (so empty slots appear in chart)
      const DAY_HOURS = ['00','02','04','06','08','10','12','14','16','18','20','22'];
      const WEEK_DAYS = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
      const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

      if (period === 'day') {
        DAY_HOURS.forEach(h => { byTime[h] = { label: `${h}:00`, revenue: 0, orders: 0, commission: 0 }; });
      } else if (period === 'week') {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now); d.setDate(now.getDate() - i);
          const key = d.toISOString().substring(0, 10);
          const dow = WEEK_DAYS[(d.getDay() + 6) % 7];
          byTime[key] = { label: dow, revenue: 0, orders: 0, commission: 0 };
        }
      } else if (period === 'month') {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const key = String(d).padStart(2, '0');
          byTime[key] = { label: key, revenue: 0, orders: 0, commission: 0 };
        }
      } else {
        MONTHS_SHORT.forEach((m, i) => {
          const key = `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
          byTime[key] = { label: m, revenue: 0, orders: 0, commission: 0 };
        });
      }

      for (const o of orders) {
        const rev = o.totalPro || 0;
        const comm = rev * commPct / 100;
        const d = new Date(o.createdAt);

        // Time bucket key
        let timeKey: string;
        if (period === 'day') {
          timeKey = String(Math.floor(d.getHours() / 2) * 2).padStart(2, '0');
        } else if (period === 'week') {
          timeKey = o.createdAt.substring(0, 10);
        } else if (period === 'month') {
          timeKey = String(d.getDate()).padStart(2, '0');
        } else {
          timeKey = o.createdAt.substring(0, 7);
        }
        if (byTime[timeKey]) {
          byTime[timeKey].revenue += rev;
          byTime[timeKey].orders += 1;
          byTime[timeKey].commission += comm;
        }

        // By professional
        const profKey = String(o.professionalId);
        if (!byProfessional[profKey]) {
          byProfessional[profKey] = { name: o.professionalName || o.professionalEmail || profKey, email: o.professionalEmail || '', orders: 0, revenue: 0, qty: 0 };
        }
        byProfessional[profKey].orders += 1;
        byProfessional[profKey].revenue += rev;
        byProfessional[profKey].qty += o.totalQty || 0;

        // By product + category
        for (const item of (o.items || [])) {
          const cat = item.cat || 'Altro';
          if (!byProduct[item.code]) {
            byProduct[item.code] = { name: item.name, cat, orders: 0, revenue: 0, qty: 0 };
          }
          const itemRev = (item.proPrice || 0) * (item.qty || 0);
          byProduct[item.code].orders += 1;
          byProduct[item.code].revenue += itemRev;
          byProduct[item.code].qty += item.qty || 0;

          if (!byCategory[cat]) byCategory[cat] = { name: cat, revenue: 0, qty: 0 };
          byCategory[cat].revenue += itemRev;
          byCategory[cat].qty += item.qty || 0;
        }
      }

      const totalRevenue = orders.reduce((s: number, o: any) => s + (o.totalPro || 0), 0);
      const totalCommission = totalRevenue * commPct / 100;
      const paidOrders = orders.filter((o: any) => o.paymentStatus === 'paid').length;
      const pendingPayment = orders.filter((o: any) => o.paymentStatus !== 'paid').length;

      const topProfessionals = Object.values(byProfessional).sort((a: any, b: any) => b.revenue - a.revenue);
      const topProducts = Object.values(byProduct).sort((a: any, b: any) => b.revenue - a.revenue);
      const byCategArr = Object.values(byCategory).sort((a: any, b: any) => b.revenue - a.revenue);
      const timeline = Object.values(byTime);

      return {
        totalRevenue,
        totalCommission,
        commPct,
        confirmedOrders: orders.filter((o: any) => o.status !== 'pending').length,
        activeProfessionals: Object.keys(byProfessional).length,
        paidOrders,
        pendingPayment,
        totalOrders: orders.length,
        period,
        timeline,
        monthly: timeline,
        topProducts,
        topProfessionals,
        byCategory: byCategArr,
        summary: { totalRevenue, totalCommission, totalOrders: orders.length, paidOrders, pendingPayment, commPct },
        byProfessional: topProfessionals,
        byProduct: topProducts,
      };
    } catch (error) {
      console.error('Error computing EV reports:', error);
      throw error;
    }
  }

  // Find or create a product in a professional's warehouse by EV code+format
  async findOrCreateEvProduct(userId: number, item: { code: string; name: string; format: string; unitPrice: number }): Promise<any> {
    try {
      const data = loadStorageData();
      if (!data.products) data.products = [];
      const sku = `EV-${item.code}-${item.format.replace(/\s+/g, '')}`;
      const existing = data.products.find(([, p]: any) => p.userId === userId && p.sku === sku);
      if (existing) return existing[1];

      // Create new product
      if (!data.productNextId) {
        const validIds = data.products.map(([id]: any) => id).filter((id: any) => id < 2147483647);
        data.productNextId = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
      }
      const newId = data.productNextId;
      data.productNextId = newId + 1;
      const newProd = {
        id: newId, userId, sku,
        name: `${item.name} ${item.format}`,
        description: `EV Cosmetics — ${item.name} ${item.format}`,
        price: item.unitPrice * 100,
        cost: null, categoryId: null, barcode: null, maxStock: null,
        unit: 'pz', supplier: 'EV Cosmetics', supplierContact: null,
        expirationDate: null, location: null, imagePath: null,
        currentStock: 0, minStock: 0, isActive: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      data.products.push([newId, newProd]);
      saveStorageData(data);
      return newProd;
    } catch (error) {
      console.error("Error find/create EV product:", error);
      throw error;
    }
  }
  // ─── EV Custom Catalog Products ──────────────────────────────────────────

  async getEvCatalogProducts(): Promise<any[]> {
    try {
      const data = loadStorageData();
      return data.evCatalogProducts || [];
    } catch (error) {
      console.error('Error getting EV catalog products:', error);
      return [];
    }
  }

  async addEvCatalogProduct(product: any): Promise<any> {
    try {
      const data = loadStorageData();
      if (!data.evCatalogProducts) data.evCatalogProducts = [];
      const code = product.code || `CUSTOM_${Date.now()}`;
      const existing = data.evCatalogProducts.findIndex((p: any) => p.code === code);
      const newProd = { ...product, code, createdAt: new Date().toISOString() };
      if (existing >= 0) {
        data.evCatalogProducts[existing] = newProd;
      } else {
        data.evCatalogProducts.push(newProd);
      }
      saveStorageData(data);
      return newProd;
    } catch (error) {
      console.error('Error adding EV catalog product:', error);
      throw error;
    }
  }

  async deleteEvCatalogProduct(code: string): Promise<boolean> {
    try {
      const data = loadStorageData();
      if (!data.evCatalogProducts) return false;
      const before = data.evCatalogProducts.length;
      data.evCatalogProducts = data.evCatalogProducts.filter((p: any) => p.code !== code);
      saveStorageData(data);
      return data.evCatalogProducts.length < before;
    } catch (error) {
      console.error('Error deleting EV catalog product:', error);
      return false;
    }
  }

  // ─── EV Sponsor Links ─────────────────────────────────────────────────────

  async getEvSponsorLinks(): Promise<any[]> {
    try {
      const data = loadStorageData();
      return (data.evSponsorLinks || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error getting EV sponsor links:', error);
      return [];
    }
  }

  async createEvSponsorLink(link: {
    sponsorId: number; sponsorName: string; sponsorEmail: string; sponsorIban?: string;
    sponsoredId: number; sponsoredName: string; sponsoredEmail: string;
    commissionPct: number; notes?: string;
  }): Promise<any> {
    try {
      const data = loadStorageData();
      if (!data.evSponsorLinks) data.evSponsorLinks = [];
      if (!data.evSponsorLinkNextId) data.evSponsorLinkNextId = 1;
      const id = data.evSponsorLinkNextId;
      data.evSponsorLinkNextId = id + 1;
      const newLink = { ...link, id, active: true, createdAt: new Date().toISOString() };
      data.evSponsorLinks.push(newLink);
      saveStorageData(data);
      return newLink;
    } catch (error) {
      console.error('Error creating EV sponsor link:', error);
      throw error;
    }
  }

  async updateEvSponsorLink(id: number, updates: Partial<any>): Promise<any | null> {
    try {
      const data = loadStorageData();
      if (!data.evSponsorLinks) return null;
      const idx = data.evSponsorLinks.findIndex((l: any) => l.id === id);
      if (idx === -1) return null;
      data.evSponsorLinks[idx] = { ...data.evSponsorLinks[idx], ...updates, updatedAt: new Date().toISOString() };
      saveStorageData(data);
      return data.evSponsorLinks[idx];
    } catch (error) {
      console.error('Error updating EV sponsor link:', error);
      throw error;
    }
  }

  async deleteEvSponsorLink(id: number): Promise<boolean> {
    try {
      const data = loadStorageData();
      if (!data.evSponsorLinks) return false;
      const before = data.evSponsorLinks.length;
      data.evSponsorLinks = data.evSponsorLinks.filter((l: any) => l.id !== id);
      saveStorageData(data);
      return (data.evSponsorLinks.length < before);
    } catch (error) {
      console.error('Error deleting EV sponsor link:', error);
      return false;
    }
  }

  async getEvSponsorLinkBySponsoredId(sponsoredId: number): Promise<any | null> {
    try {
      const data = loadStorageData();
      const links = data.evSponsorLinks || [];
      return links.find((l: any) => l.sponsoredId === sponsoredId && l.active) || null;
    } catch (error) {
      return null;
    }
  }

  // ─── EV Commissions ───────────────────────────────────────────────────────

  async createEvCommission(commission: {
    orderId: string; month: string;
    sponsorId: number; sponsorName: string; sponsorIban: string;
    sponsoredId: number; sponsoredName: string;
    orderAmount: number; commissionPct: number; commissionAmount: number;
  }): Promise<any | null> {
    try {
      const data = loadStorageData();
      if (!data.evCommissions) data.evCommissions = [];
      // Idempotency: skip if a non-cancelled commission for the same order+sponsor already exists
      const existing = data.evCommissions.find(
        (c: any) => c.orderId === commission.orderId && c.sponsorId === commission.sponsorId && c.status !== 'cancelled'
      );
      if (existing) {
        console.log(`[EV-COMM] Commission for order ${commission.orderId} already exists (id=${existing.id}) — skipping duplicate`);
        return null;
      }
      if (!data.evCommissionNextId) data.evCommissionNextId = 1;
      const id = data.evCommissionNextId;
      data.evCommissionNextId = id + 1;
      const newC = { ...commission, id, status: 'pending', createdAt: new Date().toISOString() };
      data.evCommissions.push(newC);
      saveStorageData(data);
      return newC;
    } catch (error) {
      console.error('Error creating EV commission:', error);
      throw error;
    }
  }

  async getEvCommissions(): Promise<any[]> {
    try {
      const data = loadStorageData();
      return (data.evCommissions || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      return [];
    }
  }

  async getEvCommissionsBySponsorId(sponsorId: number): Promise<any[]> {
    try {
      const data = loadStorageData();
      return (data.evCommissions || [])
        .filter((c: any) => c.sponsorId === sponsorId)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      return [];
    }
  }

  async updateEvCommission(id: number, updates: Partial<any>): Promise<any | null> {
    try {
      const data = loadStorageData();
      if (!data.evCommissions) return null;
      const idx = data.evCommissions.findIndex((c: any) => c.id === id);
      if (idx === -1) return null;
      data.evCommissions[idx] = { ...data.evCommissions[idx], ...updates };
      saveStorageData(data);
      return data.evCommissions[idx];
    } catch (error) {
      console.error('Error updating EV commission:', error);
      throw error;
    }
  }

  async cancelEvCommissionsByOrderId(orderId: string): Promise<number> {
    try {
      const data = loadStorageData();
      if (!data.evCommissions) return 0;
      let count = 0;
      data.evCommissions = data.evCommissions.map((c: any) => {
        if (c.orderId === orderId && c.status === 'pending') {
          count++;
          return { ...c, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelReason: 'order_rejected' };
        }
        return c;
      });
      if (count > 0) saveStorageData(data);
      return count;
    } catch (error) {
      console.error('Error cancelling commissions for order:', error);
      return 0;
    }
  }

  async payMonthlyCommissions(month: string, paidBy: number, paymentNotes: string): Promise<{ count: number; total: number }> {
    try {
      const data = loadStorageData();
      if (!data.evCommissions) return { count: 0, total: 0 };
      let count = 0; let total = 0;
      const now = new Date().toISOString();
      data.evCommissions = data.evCommissions.map((c: any) => {
        if (c.month === month && c.status === 'pending') {
          count++;
          total += c.commissionAmount || 0;
          return { ...c, status: 'paid', paidAt: now, paidBy, paymentNotes };
        }
        return c;
      });
      saveStorageData(data);
      return { count, total };
    } catch (error) {
      console.error('Error paying monthly commissions:', error);
      return { count: 0, total: 0 };
    }
  }
}

export const inventoryJsonStorage = new InventoryJsonStorage();
