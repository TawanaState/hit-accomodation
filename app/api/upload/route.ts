import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json(
        { message: 'No file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadDir = join(process.cwd(), 'uploads');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Ignore if directory already exists
    }

    // Generate unique filename to prevent collisions
    const originalName = file.name;
    const extension = originalName.split('.').pop() || 'tmp';
    const uniqueFilename = `${uuidv4()}.${extension}`;

    // Save file
    const path = join(uploadDir, uniqueFilename);
    await writeFile(path, buffer);

    // Return the URL for accessing the file
    // We'll create a dynamic route /api/uploads/[filename] to serve these files
    const url = `/api/uploads/${uniqueFilename}`;

    return NextResponse.json({ url, success: true });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { message: 'Internal server error during file upload' },
      { status: 500 }
    );
  }
}
export const dynamic = "force-dynamic";
