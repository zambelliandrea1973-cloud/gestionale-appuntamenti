import express from 'express';
import { storage } from './storage';
import { insertProductCategorySchema, insertProductSchema, insertStockMovementSchema, insertProductSaleSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

// Middleware to check PRO access
const requireProAccess = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    // Check if user has PRO access
    const license = await storage.getLicense(userId);
    const hasProAccess = license?.type === 'staff_pro' || license?.type === 'client_pro';
    
    if (!hasProAccess) {
      return res.status(403).json({ error: 'Funzionalità disponibile solo con abbonamento PRO' });
    }

    next();
  } catch (error) {
    console.error('Error checking PRO access:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
};

// Product Categories Routes
router.get('/categories', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    let categories = await storage.getProductCategories(userId);
    
    // Initialize default categories if user has none
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Consumabili', description: 'Materiali e prodotti consumabili per trattamenti', color: '#3b82f6' },
        { name: 'Prodotti per la vendita', description: 'Prodotti destinati alla vendita diretta ai clienti', color: '#10b981' }
      ];
      
      for (const cat of defaultCategories) {
        await storage.createProductCategory({ ...cat, userId });
      }
      
      categories = await storage.getProductCategories(userId);
    }
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Errore nel recupero delle categorie' });
  }
});

router.post('/categories', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryData = insertProductCategorySchema.parse(req.body);
    const category = await storage.createProductCategory({ ...categoryData, userId });
    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati non validi', details: error.errors });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Errore nella creazione della categoria' });
  }
});

router.put('/categories/:id', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const categoryData = insertProductCategorySchema.partial().parse(req.body);
    const category = await storage.updateProductCategory(id, userId, categoryData);
    
    if (!category) {
      return res.status(404).json({ error: 'Categoria non trovata' });
    }
    
    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati non validi', details: error.errors });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento della categoria' });
  }
});

router.delete('/categories/:id', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteProductCategory(id, userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Categoria non trovata' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della categoria' });
  }
});

// Products Routes
router.get('/products', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const products = await storage.getProducts(userId);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Errore nel recupero dei prodotti' });
  }
});

router.get('/products/:id', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const product = await storage.getProduct(id, userId);
    
    if (!product) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Errore nel recupero del prodotto' });
  }
});

router.post('/products', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const productData = insertProductSchema.parse(req.body);
    const product = await storage.createProduct({ ...productData, userId });
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati non validi', details: error.errors });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Errore nella creazione del prodotto' });
  }
});

router.put('/products/:id', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const productData = insertProductSchema.partial().parse(req.body);
    const product = await storage.updateProduct(id, userId, productData);
    
    if (!product) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }
    
    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati non validi', details: error.errors });
    }
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del prodotto' });
  }
});

router.delete('/products/:id', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteProduct(id, userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del prodotto' });
  }
});

router.get('/low-stock', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const products = await storage.getLowStockProducts(userId);
    res.json(products);
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ error: 'Errore nel recupero dei prodotti con scorte basse' });
  }
});

// Stock Movements Routes
router.get('/movements', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const movements = await storage.getStockMovements(userId, limit);
    res.json(movements);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: 'Errore nel recupero dei movimenti di magazzino' });
  }
});

router.post('/movements', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const movementData = insertStockMovementSchema.parse(req.body);
    const movement = await storage.createStockMovement({ ...movementData, userId });
    res.status(201).json(movement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati non validi', details: error.errors });
    }
    console.error('Error creating stock movement:', error);
    res.status(500).json({ error: 'Errore nella creazione del movimento di magazzino' });
  }
});

router.get('/products/:id/movements', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = parseInt(req.params.id);
    const movements = await storage.getProductStockHistory(productId, userId);
    res.json(movements);
  } catch (error) {
    console.error('Error fetching product stock history:', error);
    res.status(500).json({ error: 'Errore nel recupero dello storico del prodotto' });
  }
});

// Sales Routes
router.get('/sales', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const sales = await storage.getProductSales(userId, limit);
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Errore nel recupero delle vendite' });
  }
});

router.post('/sales', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const saleData = insertProductSaleSchema.parse(req.body);
    const sale = await storage.createProductSale({ ...saleData, userId });
    res.status(201).json(sale);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati non validi', details: error.errors });
    }
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Errore nella registrazione della vendita' });
  }
});

router.get('/products/:id/sales', requireProAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = parseInt(req.params.id);
    const sales = await storage.getProductSalesHistory(productId, userId);
    res.json(sales);
  } catch (error) {
    console.error('Error fetching product sales history:', error);
    res.status(500).json({ error: 'Errore nel recupero dello storico vendite del prodotto' });
  }
});

export default router;