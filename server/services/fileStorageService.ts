// @ts-nocheck
import { db } from '../db';
import { fileUploads } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

class FileStorageService {
  async saveFile(
    userId: number,
    category: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    metadata?: Record<string, any>
  ): Promise<{ id: number; url: string }> {
    const base64Data = file.buffer.toString('base64');
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;

    const [record] = await db.insert(fileUploads).values({
      userId,
      category,
      filename,
      mimeType: file.mimetype,
      size: file.size,
      data: base64Data,
      metadata: metadata || null,
    }).returning();

    const url = `/api/files/${record.id}/${encodeURIComponent(filename)}`;
    logger.debug(`[FILE] Saved file: ${filename} (${category}, ${file.size} bytes) → DB id=${record.id}`);
    return { id: record.id, url };
  }

  async getFile(id: number): Promise<{ data: Buffer; mimeType: string; filename: string } | null> {
    const [record] = await db.select().from(fileUploads).where(eq(fileUploads.id, id)).limit(1);
    if (!record) return null;

    return {
      data: Buffer.from(record.data, 'base64'),
      mimeType: record.mimeType,
      filename: record.filename,
    };
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = await db.delete(fileUploads).where(eq(fileUploads.id, id)).returning();
    return result.length > 0;
  }

  async getFilesByCategory(userId: number, category: string): Promise<Array<{ id: number; url: string; filename: string; mimeType: string; size: number; createdAt: Date | null }>> {
    const records = await db.select({
      id: fileUploads.id,
      filename: fileUploads.filename,
      mimeType: fileUploads.mimeType,
      size: fileUploads.size,
      createdAt: fileUploads.createdAt,
    }).from(fileUploads).where(
      and(eq(fileUploads.userId, userId), eq(fileUploads.category, category))
    );

    return records.map(r => ({
      ...r,
      url: `/api/files/${r.id}/${encodeURIComponent(r.filename)}`,
    }));
  }
}

export const fileStorageService = new FileStorageService();
