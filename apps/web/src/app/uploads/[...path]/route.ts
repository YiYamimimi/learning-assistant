import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest, { params }: { params: { '...path': string[] } }) {
  const filePath = join(process.cwd(), 'uploads', ...params['...path']);

  try {
    const file = await readFile(filePath);
    return new NextResponse(file);
  } catch (error) {
    console.error('File not found:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
