import { Product, ProductCategory, StockMovement, ProductSale, InsertProduct, InsertProductCategory, InsertStockMovement, InsertProductSale } from '@shared/schema';
import { loadStorageData, saveStorageData } from './utils/jsonStorage.js';

export class InventoryJsonStorage {
  // Product Categories
  async getProductCategories(userId: number): Promise<ProductCategory[]> {
    try {
      const data = loadStorageData();
      const categories = data.productCategories || [];
      
      return categories
        .map(([id, cat]) => cat)
        .filter(cat => cat.userId === userId)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error getting product categories:", error);
      return [];
    }
  }

  async getProductCategory(id: number, userId: number): Promise<ProductCategory | undefined> {
    try {
      const data = loadStorageData();
      const categories = data.productCategories || [];
      
      const found = categories.find(([catId, cat]) => cat.id === id && cat.userId === userId);
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
      
      // Generate safe ID: find max existing ID and increment (max integer is 2147483647)
      const maxId = data.productCategories.length > 0 
        ? Math.max(...data.productCategories.map(([id, cat]) => id))
        : 0;
      const newId = maxId + 1;
      
      const newCategory = {
        ...category,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      data.productCategories.push([newId, newCategory]);
      saveStorageData(data);
      
      return newCategory as ProductCategory;
    } catch (error) {
      console.error("Error creating product category:", error);
      throw error;
    }
  }

  async updateProductCategory(id: number, userId: number, category: Partial<InsertProductCategory>): Promise<ProductCategory | undefined> {
    try {
      const data = loadStorageData();
      
      if (!data.productCategories) return undefined;
      
      const index = data.productCategories.findIndex(([catId, cat]) => cat.id === id && cat.userId === userId);
      if (index === -1) return undefined;
      
      data.productCategories[index][1] = {
        ...data.productCategories[index][1],
        ...category,
        updatedAt: new Date().toISOString(),
      };
      
      saveStorageData(data);
      return data.productCategories[index][1] as ProductCategory;
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
      data.productCategories = data.productCategories.filter(([catId, cat]) => !(cat.id === id && cat.userId === userId));
      
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
        .map(([id, prod]) => prod)
        .filter(prod => prod.userId === userId)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }

  async getProduct(id: number, userId: number): Promise<Product | undefined> {
    try {
      const data = loadStorageData();
      const productsList = data.products || [];
      
      const found = productsList.find(([prodId, prod]) => prod.id === id && prod.userId === userId);
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
      
      // Generate safe ID: find max existing ID and increment
      const maxId = data.products.length > 0 
        ? Math.max(...data.products.map(([id, prod]) => id))
        : 0;
      const newId = maxId + 1;
      
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
      
      return newProduct as Product;
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async updateProduct(id: number, userId: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    try {
      const data = loadStorageData();
      
      if (!data.products) return undefined;
      
      const index = data.products.findIndex(([prodId, prod]) => prod.id === id && prod.userId === userId);
      if (index === -1) return undefined;
      
      data.products[index][1] = {
        ...data.products[index][1],
        ...product,
        updatedAt: new Date().toISOString(),
      };
      
      saveStorageData(data);
      return data.products[index][1] as Product;
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
      data.products = data.products.filter(([prodId, prod]) => !(prod.id === id && prod.userId === userId));
      
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
        .map(([id, prod]) => prod)
        .filter(prod => prod.userId === userId && (prod.currentStock || 0) <= (prod.minStock || 0))
        .sort((a, b) => a.name.localeCompare(b.name));
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
        .map(([id, mov]) => mov)
        .filter(mov => mov.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
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
      
      // Generate safe ID: find max existing ID and increment
      const maxId = data.stockMovements.length > 0 
        ? Math.max(...data.stockMovements.map(([id, mov]) => id))
        : 0;
      const newId = maxId + 1;
      
      const newMovement = {
        ...movement,
        id: newId,
        createdAt: new Date().toISOString(),
      };
      
      data.stockMovements.push([newId, newMovement]);
      
      // Update product stock
      const productIndex = data.products.findIndex(([id, prod]) => prod.id === movement.productId && prod.userId === movement.userId);
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
      
      return newMovement as StockMovement;
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
        .map(([id, mov]) => mov)
        .filter(mov => mov.productId === productId && mov.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
        .map(([id, sale]) => sale)
        .filter(sale => sale.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
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
      
      // Generate safe ID: find max existing ID and increment
      const maxId = data.productSales.length > 0 
        ? Math.max(...data.productSales.map(([id, s]) => id))
        : 0;
      const newId = maxId + 1;
      
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
        reason: 'Vendita prodotto',
        reference: `Vendita #${newId}`,
        staffMember: sale.staffMember,
        notes: sale.notes
      });
      
      return newSale as ProductSale;
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
        .map(([id, sale]) => sale)
        .filter(sale => sale.productId === productId && sale.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting product sales history:", error);
      return [];
    }
  }
}

export const inventoryJsonStorage = new InventoryJsonStorage();
