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
        results.append({ path: f.path, status: "success" });
      } catch (e) {
        results.append({ path: f.path, status: "error", message: e.message });
      }
    }
    return Response.json(results);
  } catch (error) {
    return Response.json({ error: true, message: error.message }, { status: 500 });
  }
}
