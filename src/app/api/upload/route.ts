import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAuthenticatedUser, successResponse, errorResponse, serverErrorResponse } from '@/lib/api-helpers';

// Max upload size: 10MB
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return errorResponse('Authentication required', 401);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return errorResponse('No file uploaded. Please attach a file.');
    }

    if (file.size === 0) {
      return errorResponse('The uploaded file is empty.');
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return errorResponse(
        `File size exceeds the maximum allowed (${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)}MB).`
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse(
        `File type "${file.type || 'unknown'}" is not allowed. Permitted: images, PDF, text, zip, Office docs.`
      );
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Build a unique filename: <userId>_<timestamp>_<random>_<safeName>.<ext>
    const ext = MIME_TO_EXT[file.type] || 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 40);
    const uniqueName = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    // Public URL path
    const url = `/uploads/${uniqueName}`;

    return successResponse(
      {
        url,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
      },
      201
    );
  } catch (e: any) {
    return serverErrorResponse(e.message || 'File upload failed');
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      maxUploadSize: MAX_UPLOAD_SIZE,
      allowedTypes: ALLOWED_MIME_TYPES,
    },
  });
}
