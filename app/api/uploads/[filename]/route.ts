import { NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;

  // Basic path traversal protection
  if (filename.includes('..') || filename.includes('/')) {
    return new NextResponse('Invalid filename', { status: 400 });
  }

  const filePath = join(process.cwd(), 'uploads', filename);

  try {
    // Check if file exists
    await stat(filePath);

    const fileBuffer = await readFile(filePath);

    // Determine content type based on extension
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.png')) contentType = 'image/png';
    else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (filename.endsWith('.webp')) contentType = 'image/webp';
    else if (filename.endsWith('.gif')) contentType = 'image/gif';
    else if (filename.endsWith('.pdf')) contentType = 'application/pdf';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return new NextResponse('File not found', { status: 404 });
    }
    console.error('Error serving file:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
