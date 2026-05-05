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
}

export const inventoryJsonStorage = new InventoryJsonStorage();
