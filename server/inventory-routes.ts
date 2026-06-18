// @ts-nocheck
import express from 'express';
import { storage } from './storage';
import { inventoryJsonStorage } from './inventory-json-storage';
import { insertProductCategorySchema, insertProductSchema, insertStockMovementSchema, insertProductSaleSchema } from '../shared/schema';
import { licenseService } from './services/licenseService';
import { z } from 'zod';
import multer from 'multer';
import { fileStorageService } from './services/fileStorageService';
import Stripe from 'stripe';
import { sendSystemEmail } from './services/systemEmailService';

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

// ─── EV Cosmetics Orders ──────────────────────────────────────────────────────

// ─── Helper: auto-generate commission if professional has a sponsor ───────────
async function maybeCreateEvCommission(professionalId: number, orderId: string, orderAmount: number): Promise<void> {
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Individual sponsor link commission
    const sponsorLink = await inventoryJsonStorage.getEvSponsorLinkBySponsoredId(professionalId);
    if (sponsorLink) {
      const commissionAmount = Math.round(orderAmount * sponsorLink.commissionPct) / 100;
      await inventoryJsonStorage.createEvCommission({
        orderId, month,
        sponsorId: sponsorLink.sponsorId,
        sponsorName: sponsorLink.sponsorName,
        sponsorIban: sponsorLink.sponsorIban || '',
        sponsoredId: professionalId,
        sponsoredName: sponsorLink.sponsoredName,
        orderAmount,
        commissionPct: sponsorLink.commissionPct,
        commissionAmount,
        commissionType: 'sponsor',
      });
      console.log(`💰 [EV-COMM] Sponsor commission €${commissionAmount.toFixed(2)} (${sponsorLink.commissionPct}%) for ${sponsorLink.sponsorName} — order ${orderId}`);
    }

    // 2. Platform commission (admin guadagna % su tutti gli ordini ev_staff)
    const settings = await inventoryJsonStorage.getEvSettings();
    const pct: number = settings.platformCommissionPct ?? 0;
    const enabled: boolean = settings.platformCommissionEnabled ?? false;
    const ownerId: number = settings.platformOwnerUserId ?? 0;
    if (enabled && pct > 0 && ownerId && ownerId !== professionalId) {
      const platformAmount = Math.round(orderAmount * pct) / 100;
      const ownerDbUser = await storage.getUser(ownerId);
      const ownerName = ownerDbUser ? (ownerDbUser.firstName && ownerDbUser.lastName ? `${ownerDbUser.firstName} ${ownerDbUser.lastName}` : ownerDbUser.username) : `Admin #${ownerId}`;
      const sponsoredDbUser = await storage.getUser(professionalId);
      const sponsoredName = sponsoredDbUser ? (sponsoredDbUser.firstName && sponsoredDbUser.lastName ? `${sponsoredDbUser.firstName} ${sponsoredDbUser.lastName}` : sponsoredDbUser.username) : `User #${professionalId}`;
      await inventoryJsonStorage.createEvCommission({
        orderId, month,
        sponsorId: ownerId,
        sponsorName: ownerName,
        sponsorIban: (ownerDbUser as any)?.iban || '',
        sponsoredId: professionalId,
        sponsoredName,
        orderAmount,
        commissionPct: pct,
        commissionAmount: platformAmount,
        commissionType: 'platform',
      });
      console.log(`🏛️ [EV-COMM] Platform commission €${platformAmount.toFixed(2)} (${pct}%) for admin ${ownerName} — order ${orderId}`);
    }
  } catch (err) {
    console.error('[EV-COMM] Failed to create commission (non-blocking):', err);
  }
}

// Submit a new order (professional → EV Cosmetics)
router.post('/ev-orders', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const { items, totalQty, totalPublic, totalPro, saving, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }
    const dbUser = await storage.getUser(user.id);
    const order = await inventoryJsonStorage.createEvOrder({
      professionalId: user.id,
      professionalName: dbUser?.username || `User ${user.id}`,
      professionalEmail: dbUser?.email || dbUser?.username || '',
      items, totalQty, totalPublic, totalPro, saving, notes,
    });
    // Commission is generated only after payment/confirmation — NOT here
    console.log(`📦 [EV-ORDERS] New order ${order.id} from user ${user.id} — ${totalQty}pz €${totalPro}`);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating EV order:', error);
    res.status(500).json({ error: 'Error submitting order' });
  }
});

// List all orders (admin sees all; professional sees own)
router.get('/ev-orders', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    let orders;
    if (dbUser?.type === 'admin' || dbUser?.role === 'ev_admin') {
      orders = await inventoryJsonStorage.getEvOrders();
    } else {
      orders = await inventoryJsonStorage.getEvOrdersByProfessional(user.id);
    }
    res.json(orders);
  } catch (error) {
    console.error('Error fetching EV orders:', error);
    res.status(500).json({ error: 'Error retrieving orders' });
  }
});

// Confirm order + auto-load stock into professional's warehouse (admin only)
router.patch('/ev-orders/:id/confirm', requireProAccess, async (req, res) => {
  try {
    const adminUser = req.user!;
    const dbAdmin = await storage.getUser(adminUser.id);
    if (dbAdmin?.type !== 'admin' && dbAdmin?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Only admin or ev_admin can confirm orders' });
    }
    const orderId = req.params.id;
    const orders = await inventoryJsonStorage.getEvOrders();
    const order = orders.find((o: any) => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order is already processed' });
    }

    // Load stock for each item into the professional's warehouse
    const professionalId = order.professionalId;
    for (const item of order.items) {
      const product = await inventoryJsonStorage.findOrCreateEvProduct(professionalId, {
        code: item.code, name: item.name, format: item.format, unitPrice: item.unitPrice,
      });
      await inventoryJsonStorage.createStockMovement({
        userId: professionalId,
        productId: product.id,
        movementType: 'IN',
        quantity: item.qty,
        unitPrice: Math.round(item.proPrice * 100),
        totalValue: Math.round(item.proPrice * item.qty * 100),
        reason: `Ordine EV Cosmetics ${orderId}`,
        reference: orderId,
        staffMember: dbAdmin?.username || 'Admin EV',
        notes: `Confermato il ${new Date().toLocaleDateString('it-IT')}`,
      });
    }

    const updated = await inventoryJsonStorage.updateEvOrder(orderId, {
      status: 'confirmed',
      stockLoaded: true,
      confirmedAt: new Date().toISOString(),
      confirmedBy: adminUser.id,
    });
    // Generate commission now that the bank-transfer order is confirmed
    maybeCreateEvCommission(professionalId, orderId, order.totalPro || 0);
    console.log(`✅ [EV-ORDERS] Order ${orderId} confirmed — stock loaded for user ${professionalId}`);
    res.json(updated);
  } catch (error) {
    console.error('Error confirming EV order:', error);
    res.status(500).json({ error: 'Error confirming order' });
  }
});

// Reject order (admin only)
router.patch('/ev-orders/:id/reject', requireProAccess, async (req, res) => {
  try {
    const adminUser = req.user!;
    const dbAdmin = await storage.getUser(adminUser.id);
    if (dbAdmin?.type !== 'admin' && dbAdmin?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Only admin or ev_admin can reject orders' });
    }
    const orderId = req.params.id;
    const updated = await inventoryJsonStorage.updateEvOrder(orderId, {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedBy: adminUser.id,
      rejectionReason: req.body.reason || '',
    });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    // Auto-cancel any pending commissions linked to this rejected order
    inventoryJsonStorage.cancelEvCommissionsByOrderId(orderId).catch(() => {});
    res.json(updated);
  } catch (error) {
    console.error('Error rejecting EV order:', error);
    res.status(500).json({ error: 'Error rejecting order' });
  }
});

// Mark order as shipped — admin or ev_admin — sends email to professional
router.patch('/ev-orders/:id/ship', requireProAccess, async (req, res) => {
  try {
    const adminUser = req.user!;
    const dbAdmin = await storage.getUser(adminUser.id);
    if (dbAdmin?.type !== 'admin' && dbAdmin?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Only admin or ev_admin can update shipping' });
    }
    const orderId = req.params.id;
    const { trackingCode = '', trackingUrl = '', notes = '' } = req.body;
    const updated = await inventoryJsonStorage.updateEvOrder(orderId, {
      status: 'shipped',
      shippedAt: new Date().toISOString(),
      trackingCode,
      trackingUrl,
      shippingNotes: notes,
    });
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    // Send email notification to professional
    if (updated.professionalEmail) {
      const trackingHtml = trackingCode
        ? `<p>📦 Codice spedizione: <strong>${trackingCode}</strong></p>${trackingUrl ? `<p><a href="${trackingUrl}">Traccia il pacco</a></p>` : ''}`
        : '';
      const notesHtml = notes ? `<p>Note: ${notes}</p>` : '';
      await sendSystemEmail(
        updated.professionalEmail,
        `EV Cosmetics — Ordine ${orderId} spedito! 🚚`,
        `<div style="font-family:sans-serif;max-width:500px;margin:auto">
          <div style="background:linear-gradient(135deg,#7b52d3,#9b72f3);padding:24px;border-radius:12px 12px 0 0">
            <h2 style="color:white;margin:0">EV Cosmetics — Ordine Spedito!</h2>
          </div>
          <div style="background:#fafafa;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
            <p>Il tuo ordine <strong>${orderId}</strong> è stato spedito.</p>
            ${trackingHtml}
            ${notesHtml}
            <p style="color:#6b7280;font-size:13px">Importo: <strong>€${(updated.totalPro||0).toFixed(2)}</strong> · ${updated.totalQty} pz</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
            <p style="color:#9ca3af;font-size:12px">EV Cosmetics · Gestionale Professionisti</p>
          </div>
        </div>`
      );
    }
    console.log(`🚚 [EV-ORDERS] Order ${orderId} shipped by user ${adminUser.id}`);
    res.json(updated);
  } catch (error) {
    console.error('Error shipping EV order:', error);
    res.status(500).json({ error: 'Error updating shipping status' });
  }
});

// ─── EV Payment Status (all EV users) ────────────────────────────────────

// GET /api/inventory/ev-payment-status — returns whether payments are configured (no sensitive data)
router.get('/ev-payment-status', requireProAccess, async (req, res) => {
  try {
    const settings = await inventoryJsonStorage.getEvSettings();
    const hasStripe = !!(settings.stripeSecretKey && !settings.stripeSecretKey.startsWith('***') && settings.stripeSecretKey.length > 10);
    const hasIban = !!(settings.ibanEv && settings.ibanEv.trim().length > 4);
    const active = hasStripe || hasIban;
    const mode = hasStripe ? 'stripe' : hasIban ? 'transfer' : 'none';
    res.json({ active, mode });
  } catch (error) {
    res.json({ active: false, mode: 'none' });
  }
});

// ─── EV Settings (admin only) ─────────────────────────────────────────────

// GET /api/inventory/ev-settings — returns EV config (Stripe key masked, commission %)
router.get('/ev-settings', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const settings = await inventoryJsonStorage.getEvSettings();
    // Mask secret key
    const masked = { ...settings };
    if (masked.stripeSecretKey) masked.stripeSecretKey = '***' + masked.stripeSecretKey.slice(-4);
    res.json(masked);
  } catch (error) {
    console.error('Error getting EV settings:', error);
    res.status(500).json({ error: 'Error loading settings' });
  }
});

// PATCH /api/inventory/ev-settings — update EV config (admin only)
router.patch('/ev-settings', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin') {
      return res.status(403).json({ error: 'Only main admin can update EV settings' });
    }
    // Don't overwrite secret key if masked value submitted
    const body = { ...req.body };
    if (body.stripeSecretKey && body.stripeSecretKey.startsWith('***')) {
      delete body.stripeSecretKey;
    }
    // Always store who the platform owner is (the admin saving these settings)
    body.platformOwnerUserId = user.id;
    const updated = await inventoryJsonStorage.saveEvSettings(body);
    const masked = { ...updated };
    if (masked.stripeSecretKey) masked.stripeSecretKey = '***' + masked.stripeSecretKey.slice(-4);
    res.json(masked);
  } catch (error) {
    console.error('Error saving EV settings:', error);
    res.status(500).json({ error: 'Error saving settings' });
  }
});

// ─── EV Stripe Checkout ───────────────────────────────────────────────────

// POST /api/inventory/ev-orders/create-checkout — create Stripe session for EV order
router.post('/ev-orders/create-checkout', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    const { items, totalQty, totalPublic, totalPro, saving, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const settings = await inventoryJsonStorage.getEvSettings();

    // Build base URL
    let baseUrl: string;
    if (process.env.PRODUCTION_DOMAIN) {
      baseUrl = `https://${process.env.PRODUCTION_DOMAIN}`;
    } else {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      baseUrl = `${protocol}://${req.get('host')}`;
    }

    // Create the pending order first
    const order = await inventoryJsonStorage.createEvOrder({
      professionalId: user.id,
      professionalName: dbUser?.username || `User ${user.id}`,
      professionalEmail: dbUser?.email || dbUser?.username || '',
      items, totalQty, totalPublic, totalPro, saving, notes,
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
    });

    // If EV Stripe key configured → create Stripe session
    if (settings.stripeSecretKey && !settings.stripeSecretKey.startsWith('***')) {
      const stripe = new Stripe(settings.stripeSecretKey, { apiVersion: '2023-10-16' });
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: items.map((item: any) => ({
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${item.name} — ${item.format}`,
              description: `Sconto professionisti: –${item.discountPct}%`,
            },
            unit_amount: Math.round(item.proPrice * 100),
          },
          quantity: item.qty,
        })),
        metadata: { orderId: order.id, professionalId: String(user.id) },
        success_url: `${baseUrl}/ev-cosmetics/payment-success?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/ev-cosmetics/shop?order_cancelled=${order.id}`,
      });

      // Save Stripe session ID to order
      await inventoryJsonStorage.updateEvOrder(order.id, { stripeSessionId: session.id });
      // Commission will be generated in verify-payment after Stripe confirms paid — NOT here

      console.log(`💳 [EV-CHECKOUT] Stripe session ${session.id} for order ${order.id}`);
      return res.json({ success: true, mode: 'stripe', url: session.url, orderId: order.id });
    }

    // Fallback: transfer / manual — commission generated when admin confirms the order — NOT here
    console.log(`🏦 [EV-CHECKOUT] Manual transfer for order ${order.id}`);
    return res.json({
      success: true,
      mode: 'transfer',
      orderId: order.id,
      iban: settings.ibanEv || '',
      ibanHolder: settings.ibanHolder || 'EV Cosmetics',
      bankName: settings.bankName || '',
      amount: totalPro,
      reference: order.id,
    });

  } catch (error) {
    console.error('Error creating EV checkout:', error);
    res.status(500).json({ error: 'Error creating checkout' });
  }
});

// POST /api/inventory/ev-orders/verify-payment — called from success page
router.post('/ev-orders/verify-payment', requireProAccess, async (req, res) => {
  try {
    const { orderId, sessionId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId required' });

    const orders = await inventoryJsonStorage.getEvOrders();
    const order = orders.find((o: any) => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Idempotency guard: if already paid, return current state without re-processing
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, paid: true, order });
    }

    // Verify with Stripe if session provided
    if (sessionId) {
      const settings = await inventoryJsonStorage.getEvSettings();
      if (settings.stripeSecretKey && !settings.stripeSecretKey.startsWith('***')) {
        const stripe = new Stripe(settings.stripeSecretKey, { apiVersion: '2023-10-16' });
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
          const updated = await inventoryJsonStorage.updateEvOrder(orderId, {
            paymentStatus: 'paid',
            paymentMethod: 'stripe',
            stripePaymentIntentId: session.payment_intent,
            paidAt: new Date().toISOString(),
          });
          // Generate commission now that Stripe payment is confirmed
          maybeCreateEvCommission(order.professionalId, orderId, order.totalPro || 0);
          console.log(`✅ [EV-PAYMENT] Order ${orderId} paid via Stripe`);
          return res.json({ success: true, paid: true, order: updated });
        }
      }
    }

    res.json({ success: true, paid: order.paymentStatus === 'paid', order });
  } catch (error) {
    console.error('Error verifying EV payment:', error);
    res.status(500).json({ error: 'Error verifying payment' });
  }
});

// ─── EV Reports (admin only) ──────────────────────────────────────────────

router.get('/ev-reports', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const period = (req.query.period as string) || 'month';
    const validPeriods = ['day', 'week', 'month', 'year'];
    const safePeriod = validPeriods.includes(period) ? period as any : 'month';
    const reports = await inventoryJsonStorage.getEvReports(safePeriod);
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(reports);
  } catch (error) {
    console.error('Error getting EV reports:', error);
    res.status(500).json({ error: 'Error loading reports' });
  }
});

// ─── EV Custom Catalog Products ──────────────────────────────────────────────

// GET /api/inventory/ev-catalog — returns all custom catalog products
router.get('/ev-catalog', requireProAccess, async (req, res) => {
  try {
    const products = await inventoryJsonStorage.getEvCatalogProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error loading catalog' });
  }
});

// POST /api/inventory/ev-catalog — add or update a product (with optional base64 image)
router.post('/ev-catalog', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const product = await inventoryJsonStorage.addEvCatalogProduct(req.body);
    res.json(product);
  } catch (error) {
    console.error('Error adding catalog product:', error);
    res.status(500).json({ error: 'Error saving product' });
  }
});

// POST /api/inventory/ev-catalog/:code/image — upload product image
router.post('/ev-catalog/:code/image', requireProAccess, uploadProductImage.single('image'), async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const code = req.params.code;
    const result = await fileStorageService.saveFile(user.id, 'ev-catalog', {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
    // Update the product's img field
    const products = await inventoryJsonStorage.getEvCatalogProducts();
    const existing = products.find((p: any) => p.code === code);
    if (existing) {
      await inventoryJsonStorage.addEvCatalogProduct({ ...existing, img: result.url });
    }
    res.json({ url: result.url });
  } catch (error) {
    console.error('Error uploading catalog image:', error);
    res.status(500).json({ error: 'Error uploading image' });
  }
});

// DELETE /api/inventory/ev-catalog/:code — remove a custom product
router.delete('/ev-catalog/:code', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const ok = await inventoryJsonStorage.deleteEvCatalogProduct(req.params.code);
    if (!ok) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// ─── EV Sponsor Links ────────────────────────────────────────────────────────

// GET /api/inventory/ev-my-sponsor-links — ev_staff: solo i link dove sono il SPONSOR
router.get('/ev-my-sponsor-links', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const allLinks = await inventoryJsonStorage.getEvSponsorLinks();
    const myLinks = allLinks.filter((l: any) => l.sponsorId === user.id && l.active);
    res.json(myLinks);
  } catch (error) {
    res.status(500).json({ error: 'Error loading my sponsor links' });
  }
});

// GET /api/inventory/ev-sponsor-links — admin/ev_admin: all links
router.get('/ev-sponsor-links', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const links = await inventoryJsonStorage.getEvSponsorLinks();
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Error loading sponsor links' });
  }
});

// POST /api/inventory/ev-sponsor-links — create a sponsor link
router.post('/ev-sponsor-links', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { sponsorId, sponsoredId, commissionPct, notes } = req.body;
    if (!sponsorId || !sponsoredId || commissionPct === undefined) {
      return res.status(400).json({ error: 'sponsorId, sponsoredId, commissionPct required' });
    }
    // Prevent self-sponsorship
    if (sponsorId === sponsoredId) {
      return res.status(400).json({ error: 'A user cannot sponsor themselves' });
    }
    // Check if sponsored already has an active sponsor
    const existing = await inventoryJsonStorage.getEvSponsorLinkBySponsoredId(Number(sponsoredId));
    if (existing) {
      return res.status(409).json({ error: 'This user already has an active sponsor' });
    }
    // Fetch user details
    const [sponsorUser, sponsoredUser] = await Promise.all([
      storage.getUser(Number(sponsorId)),
      storage.getUser(Number(sponsoredId)),
    ]);
    if (!sponsorUser || !sponsoredUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    const sponsorName = sponsorUser.firstName && sponsorUser.lastName
      ? `${sponsorUser.firstName} ${sponsorUser.lastName}`
      : sponsorUser.username;
    const sponsoredName = sponsoredUser.firstName && sponsoredUser.lastName
      ? `${sponsoredUser.firstName} ${sponsoredUser.lastName}`
      : sponsoredUser.username;
    const link = await inventoryJsonStorage.createEvSponsorLink({
      sponsorId: Number(sponsorId),
      sponsorName: sponsorName || String(sponsorId),
      sponsorEmail: sponsorUser.email || '',
      sponsorIban: (sponsorUser as any).iban || '',
      sponsoredId: Number(sponsoredId),
      sponsoredName: sponsoredName || String(sponsoredId),
      sponsoredEmail: sponsoredUser.email || '',
      commissionPct: Number(commissionPct),
      notes: notes || '',
    });
    console.log(`🤝 [EV-SPONSOR] Link created: ${sponsorName} → ${sponsoredName} @ ${commissionPct}%`);
    res.status(201).json(link);
  } catch (error) {
    console.error('Error creating EV sponsor link:', error);
    res.status(500).json({ error: 'Error creating sponsor link' });
  }
});

// PATCH /api/inventory/ev-sponsor-links/:id — update % or active status
router.patch('/ev-sponsor-links/:id', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = parseInt(req.params.id);
    const { commissionPct, active, notes } = req.body;
    const updates: any = {};
    if (commissionPct !== undefined) updates.commissionPct = Number(commissionPct);
    if (active !== undefined) updates.active = Boolean(active);
    if (notes !== undefined) updates.notes = notes;
    const updated = await inventoryJsonStorage.updateEvSponsorLink(id, updates);
    if (!updated) return res.status(404).json({ error: 'Sponsor link not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating sponsor link' });
  }
});

// DELETE /api/inventory/ev-sponsor-links/:id
router.delete('/ev-sponsor-links/:id', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = parseInt(req.params.id);
    const ok = await inventoryJsonStorage.deleteEvSponsorLink(id);
    if (!ok) return res.status(404).json({ error: 'Sponsor link not found' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting sponsor link' });
  }
});

// ─── EV Commissions ──────────────────────────────────────────────────────────

// GET /api/inventory/ev-commissions — admin/ev_admin: all; ev_staff: own (as sponsor)
router.get('/ev-commissions', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    const isAdmin = dbUser?.type === 'admin' || dbUser?.role === 'ev_admin';
    let commissions;
    if (isAdmin) {
      commissions = await inventoryJsonStorage.getEvCommissions();
    } else {
      commissions = await inventoryJsonStorage.getEvCommissionsBySponsorId(user.id);
    }
    res.json(commissions);
  } catch (error) {
    res.status(500).json({ error: 'Error loading commissions' });
  }
});

// PATCH /api/inventory/ev-commissions/:id/pay — mark single commission as paid
router.patch('/ev-commissions/:id/pay', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = parseInt(req.params.id);
    const { paymentNotes = '' } = req.body;
    const updated = await inventoryJsonStorage.updateEvCommission(id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      paidBy: user.id,
      paymentNotes,
    });
    if (!updated) return res.status(404).json({ error: 'Commission not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error marking commission as paid' });
  }
});

// PATCH /api/inventory/ev-commissions/:id/cancel — cancel a commission
router.patch('/ev-commissions/:id/cancel', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = parseInt(req.params.id);
    const updated = await inventoryJsonStorage.updateEvCommission(id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: user.id,
    });
    if (!updated) return res.status(404).json({ error: 'Commission not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error cancelling commission' });
  }
});

// POST /api/inventory/ev-commissions/pay-monthly — pay all pending for a month
router.post('/ev-commissions/pay-monthly', requireProAccess, async (req, res) => {
  try {
    const user = req.user!;
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.type !== 'admin' && dbUser?.role !== 'ev_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { month, paymentNotes = '' } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month required (YYYY-MM)' });
    }
    const result = await inventoryJsonStorage.payMonthlyCommissions(month, user.id, paymentNotes);
    console.log(`💸 [EV-COMM] Paid ${result.count} commissions for ${month} — total €${result.total.toFixed(2)}`);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Error paying monthly commissions' });
  }
});

export default router;