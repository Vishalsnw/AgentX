import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req) {
  try {
    const { files } = await req.json();
    const results = [];
    
    for (const f of files) {
      const filePath = path.resolve(process.cwd(), f.path);
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, f.content);
        results.push({ path: f.path, status: "success" });
      } catch (e) {
        results.push({ path: f.path, status: "error", message: e.message });
      }
    }
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: true, message: error.message }, { status: 500 });
  }
}
