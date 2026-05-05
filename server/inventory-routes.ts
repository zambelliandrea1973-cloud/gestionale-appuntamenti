// @ts-nocheck
import express from 'express';
import { storage } from './storage';
import { insertProductCategorySchema, insertProductSchema, insertStockMovementSchema, insertProductSaleSchema } from '../shared/schema';
import { licenseService } from './services/licenseService';
import { z } from 'zod';
import multer from 'multer';
import { fileStorageService } from './services/fileStorageService';

const router = express.Router();

const uploadProductImage = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo file non supportato. Usa immagini JPG, PNG, GIF o WEBP'));
    }
  }
});

// Middleware to check PRO access using the existing license system
const requireProAccess = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Staff and admin always have access
    if (user.type === 'staff' || user.type === 'admin') {
      return next();
    }
    
    // For other users, check their license via the license service
    const licenseInfo = await licenseService.getCurrentLicenseInfo(userId);
    
    // Check if license is active and not expired
    const isActive = licenseInfo.isActive && (licenseInfo.expiresAt === null || licenseInfo.expiresAt > new Date());
    
    // Allow access for PRO, BUSINESS, STAFF_FREE, and PASSEPARTOUT licenses
    const hasAccess = isActive && (
      licenseInfo.type === 'pro' || 
      licenseInfo.type === 'business' || 
      licenseInfo.type === 'staff_free' ||
      licenseInfo.type === 'staff_free_10years' ||
      licenseInfo.type === 'passepartout'
    );
    
    if (hasAccess) {
      return next();
    }
    
    return res.status(403).json({ error: 'Feature available only with PRO subscription or higher' });
    
  } catch (error) {
    console.error('❌ [INVENTORY ACCESS] Error checking access:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Product Categories Routes
router.get('/categories', requireProAccess, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user!.id;
    console.log(`📦 [CATEGORIES] GET request for user ${userId}`);
    let categories = await storage.getProductCategories(userId);
    console.log(`📦 [CATEGORIES] Found ${categories.length} categories`);
    
    // Initialize default categories if user has none
    if (categories.length === 0) {
      console.log(`📦 [CATEGORIES] Creating default categories for user ${userId}`);
      const defaultCategories = [
        { name: 'Consumabili', description: 'Materiali e prodotti consumabili per trattamenti', color: '#3b82f6' },
        { name: 'Prodotti per la vendita', description: 'Prodotti destinati alla vendita diretta ai clienti', color: '#10b981' }
      ];
      
      for (const cat of defaultCategories) {
        const created = await storage.createProductCategory({ ...cat, userId });
        console.log(`📦 [CATEGORIES] Created category: ${created.name} (ID: ${created.id})`);
      }
      
      categories = await storage.getProductCategories(userId);
      console.log(`📦 [CATEGORIES] Total categories after init: ${categories.length}`);
    }
    
    console.log(`📦 [CATEGORIES] Returning ${categories.length} categories`);
    res.json(categories);
  } catch (error) {
    console.error('❌ [CATEGORIES] Error:', error);
    res.status(500).json({ error: 'Error retrieving categories' });
  }
});

router.post('/categories', requireProAccess, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user!.id;
    console.log(`📦 [CATEGORIES] POST request for user ${userId}`, req.body);
    const categoryData = insertProductCategorySchema.parse(req.body);
    const category = await storage.createProductCategory({ ...categoryData, userId });
    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Error creating category' });
  }
});

router.put('/categories/:id', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    const categoryData = insertProductCategorySchema.partial().parse(req.body);
    const category = await storage.updateProductCategory(id, userId, categoryData);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Error updating category' });
  }
});

router.delete('/categories/:id', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteProductCategory(id, userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Error deleting category' });
  }
});

// Products Routes
router.get('/products', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const products = await storage.getProducts(userId);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error retrieving products' });
  }
});

router.get('/products/:id', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    const product = await storage.getProduct(id, userId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Error retrieving product' });
  }
});

router.post('/products', requireProAccess, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user!.id;
    console.log(`📦 [PRODUCTS] POST request for user ${userId}`);
    console.log(`📦 [PRODUCTS] Request body:`, JSON.stringify(req.body, null, 2));
    
    const productData = insertProductSchema.parse(req.body);
    console.log(`📦 [PRODUCTS] Validated product data:`, JSON.stringify(productData, null, 2));
    
    const product = await storage.createProduct({ ...productData, userId });
    console.log(`📦 [PRODUCTS] Created product:`, JSON.stringify(product, null, 2));
    
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [PRODUCTS] Validation error:', error.errors);
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('❌ [PRODUCTS] Error creating product:', error);
    res.status(500).json({ error: 'Error creating product' });
  }
});

router.put('/products/:id', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    const productData = insertProductSchema.partial().parse(req.body);
    const product = await storage.updateProduct(id, userId, productData);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Error updating product' });
  }
});

router.delete('/products/:id', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    // Get product first to delete image if exists
    const product = await storage.getProduct(id, userId);
    if (product?.imagePath) {
      const imagePath = path.join(process.cwd(), product.imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    const deleted = await storage.deleteProduct(id, userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// Upload product image
router.post('/products/:id/upload-image', requireProAccess, uploadProductImage.single('image'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    const product = await storage.getProduct(id, userId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (product.imagePath) {
      const oldMatch = product.imagePath.match(/\/api\/files\/(\d+)\//);
      if (oldMatch) {
        await fileStorageService.deleteFile(parseInt(oldMatch[1]));
      }
    }
    
    const saved = await fileStorageService.saveFile(
      userId,
      'products',
      { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
      { productId: id }
    );
    
    const updatedProduct = await storage.updateProduct(id, userId, { imagePath: saved.url });
    
    res.json({ 
      success: true, 
      imagePath: saved.url,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).json({ error: 'Error uploading image' });
  }
});

router.delete('/products/:id/delete-image', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    const product = await storage.getProduct(id, userId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (!product.imagePath) {
      return res.status(400).json({ error: 'No image to delete' });
    }
    
    const fileIdMatch = product.imagePath.match(/\/api\/files\/(\d+)\//);
    if (fileIdMatch) {
      await fileStorageService.deleteFile(parseInt(fileIdMatch[1]));
    }
    
    const updatedProduct = await storage.updateProduct(id, userId, { imagePath: null });
    
    res.json({ 
      success: true,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ error: 'Error deleting image' });
  }
});

router.get('/low-stock', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const products = await storage.getLowStockProducts(userId);
    res.json(products);
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ error: 'Error retrieving low stock products' });
  }
});

// Stock Movements Routes
router.get('/movements', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const movements = await storage.getStockMovements(userId, limit);
    res.json(movements);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: 'Error retrieving inventory movements' });
  }
});

router.post('/movements', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const movementData = insertStockMovementSchema.parse(req.body);
    const movement = await storage.createStockMovement({ ...movementData, userId });
    res.status(201).json(movement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error creating stock movement:', error);
    res.status(500).json({ error: 'Error creating inventory movement' });
  }
});

router.get('/products/:id/movements', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const productId = parseInt(req.params.id);
    const movements = await storage.getProductStockHistory(productId, userId);
    res.json(movements);
  } catch (error) {
    console.error('Error fetching product stock history:', error);
    res.status(500).json({ error: 'Error retrieving product history' });
  }
});

// Sales Routes
router.get('/sales', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const sales = await storage.getProductSales(userId, limit);
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Error retrieving sales' });
  }
});

router.post('/sales', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const saleData = insertProductSaleSchema.parse(req.body);
    const sale = await storage.createProductSale({ ...saleData, userId });
    res.status(201).json(sale);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Error registering sale' });
  }
});

router.get('/products/:id/sales', requireProAccess, async (req, res) => {
  try {
    const userId = req.user!.id;
    const productId = parseInt(req.params.id);
    const sales = await storage.getProductSalesHistory(productId, userId);
    res.json(sales);
  } catch (error) {
    console.error('Error fetching product sales history:', error);
    res.status(500).json({ error: 'Error retrieving product sales history' });
  }
});

export default router;