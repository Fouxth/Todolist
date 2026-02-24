import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const attachmentsRouter = Router();

// POST /api/tasks/:taskId/attachments — Upload file(s) to a task
attachmentsRouter.post('/tasks/:taskId/attachments', authenticate, async (req: AuthRequest, res) => {
    try {
        const taskId = req.params.taskId as string;
        const userId = req.userId!;

        // Check task exists
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        // Parse multipart manually using raw body
        // We use a simple approach: read chunks and save
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            res.status(400).json({ error: 'Expected multipart/form-data' });
            return;
        }

        const boundary = contentType.split('boundary=')[1];
        if (!boundary) {
            res.status(400).json({ error: 'No boundary found' });
            return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
            try {
                const body = Buffer.concat(chunks);
                const parts = parseMultipart(body, boundary);
                const attachments = [];

                for (const part of parts) {
                    if (!part.filename) continue;

                    // Reject files over 25MB
                    if (part.data.length > 25 * 1024 * 1024) {
                        return res.status(413).json({ error: `${part.filename} exceeds 25MB limit` });
                    }

                    // Generate unique filename
                    const ext = path.extname(part.filename);
                    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
                    const filePath = path.join(UPLOAD_DIR, uniqueName);

                    fs.writeFileSync(filePath, part.data);

                    const attachment = await prisma.attachment.create({
                        data: {
                            taskId,
                            name: part.filename,
                            url: `/uploads/${uniqueName}`,
                            type: part.contentType || 'application/octet-stream',
                            size: part.data.length,
                            uploadedBy: userId,
                        },
                    });

                    attachments.push(attachment);
                }

                res.status(201).json(attachments);
            } catch (err) {
                console.error('Error processing upload:', err);
                res.status(500).json({ error: 'Failed to process upload' });
            }
        });
    } catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({ error: 'Failed to upload attachment' });
    }
});

// GET /api/attachments/:id/download — Download a file
attachmentsRouter.get('/attachments/:id/download', async (req, res) => {
    try {
        const id = req.params.id as string;
        const attachment = await prisma.attachment.findUnique({
            where: { id },
        });

        if (!attachment) {
            res.status(404).json({ error: 'Attachment not found' });
            return;
        }

        const filename = path.basename(attachment.url);
        const filePath = path.join(UPLOAD_DIR, filename);

        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: 'File not found on disk' });
            return;
        }

        res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
        res.setHeader('Content-Type', attachment.type);
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ error: 'Failed to download' });
    }
});

// DELETE /api/attachments/:id — Delete a file
attachmentsRouter.delete('/attachments/:id', authenticate, async (req: AuthRequest, res) => {
    try {
        const id = req.params.id as string;
        const attachment = await prisma.attachment.findUnique({
            where: { id },
        });

        if (!attachment) {
            res.status(404).json({ error: 'Attachment not found' });
            return;
        }

        // Delete from disk
        const filename = path.basename(attachment.url);
        const filePath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        await prisma.attachment.delete({ where: { id } });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({ error: 'Failed to delete attachment' });
    }
});

// Simple multipart parser
interface MultipartPart {
    filename?: string;
    contentType?: string;
    data: Buffer;
}

function parseMultipart(body: Buffer, boundary: string): MultipartPart[] {
    const parts: MultipartPart[] = [];
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const endBoundary = Buffer.from(`--${boundary}--`);

    let start = body.indexOf(boundaryBuffer) + boundaryBuffer.length + 2; // skip \r\n

    while (start < body.length) {
        const nextBoundary = body.indexOf(boundaryBuffer, start);
        if (nextBoundary === -1) break;

        const partData = body.subarray(start, nextBoundary - 2); // -2 for \r\n before boundary
        const headerEnd = partData.indexOf('\r\n\r\n');
        if (headerEnd === -1) { start = nextBoundary + boundaryBuffer.length + 2; continue; }

        const headerStr = partData.subarray(0, headerEnd).toString();
        const fileData = partData.subarray(headerEnd + 4);

        // Parse headers
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        const contentTypeMatch = headerStr.match(/Content-Type:\s*(.+)/i);

        if (filenameMatch) {
            parts.push({
                filename: filenameMatch[1],
                contentType: contentTypeMatch ? contentTypeMatch[1].trim() : undefined,
                data: fileData,
            });
        }

        start = nextBoundary + boundaryBuffer.length + 2;
    }

    return parts;
}
