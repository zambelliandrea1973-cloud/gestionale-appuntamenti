// @ts-nocheck
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../db';
import { fileUploads } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'gestionale-files';

const r2Enabled = !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

let s3Client: S3Client | null = null;
if (r2Enabled) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
  logger.info('[FILE] Cloudflare R2 object storage configurato');
} else {
  logger.warn('[FILE] R2 non configurato — fallback a base64 in PostgreSQL');
}

class FileStorageService {
  async saveFile(
    userId: number,
    category: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    metadata?: Record<string, any>
  ): Promise<{ id: number; url: string }> {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const r2Key = `${category}/${filename}`;

    let dataField = '';

    if (s3Client) {
      await s3Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      dataField = `r2://${r2Key}`;
    } else {
      dataField = file.buffer.toString('base64');
    }

    const [record] = await db.insert(fileUploads).values({
      userId,
      category,
      filename,
      mimeType: file.mimetype,
      size: file.size,
      data: dataField,
      metadata: metadata || null,
    }).returning();

    const url = `/api/files/${record.id}/${encodeURIComponent(filename)}`;
    logger.debug(`[FILE] Saved: ${filename} (${category}, ${file.size} bytes) → ${s3Client ? 'R2' : 'DB'} id=${record.id}`);
    return { id: record.id, url };
  }

  async getFile(id: number): Promise<{ data: Buffer; mimeType: string; filename: string } | null> {
    const [record] = await db.select().from(fileUploads).where(eq(fileUploads.id, id)).limit(1);
    if (!record) return null;

    let data: Buffer;

    if (record.data.startsWith('r2://') && s3Client) {
      const r2Key = record.data.replace('r2://', '');
      const response = await s3Client.send(new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
      }));
      data = Buffer.from(await response.Body!.transformToByteArray());
    } else if (record.data.startsWith('r2://')) {
      return null;
    } else {
      data = Buffer.from(record.data, 'base64');
    }

    return {
      data,
      mimeType: record.mimeType,
      filename: record.filename,
    };
  }

  async deleteFile(id: number): Promise<boolean> {
    const [record] = await db.select().from(fileUploads).where(eq(fileUploads.id, id)).limit(1);
    if (!record) return false;

    if (record.data.startsWith('r2://') && s3Client) {
      const r2Key = record.data.replace('r2://', '');
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: r2Key,
        }));
      } catch (err) {
        logger.warn(`[FILE] Errore eliminazione da R2: ${r2Key}`, err);
      }
    }

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
