import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  console.log(`POST ${req.nextUrl.pathname}`);
  try {
    const { files } = await req.json();
    const results: any[] = [];
    
    for (const f of files) {
      const filePath = path.resolve(process.cwd(), f.path);
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, f.content);
        results.push({ path: f.path, status: "success" });
      } catch (e: any) {
        results.push({ path: f.path, status: "error", message: e.message });
      }
    }
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: true, message: error.message }, { status: 500 });
  }
}
