import { NextResponse, NextRequest } from 'next/server';
import path from 'path';

export async function POST(req: NextRequest) {
  console.log(`POST ${req.nextUrl.pathname}`);
  try {
    const { repo_url, token } = await req.json();
    const gtoken = token || process.env.GITHUB_TOKEN_SECRET;
    let url = repo_url;
    if (gtoken) url = url.replace("https://github.com/", `https://${gtoken}@github.com/`);
    
    const folder = url.split('/').pop().replace('.git', '').split('@').pop();
    const targetPath = path.resolve(process.cwd(), folder);
    
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    await execPromise(`git clone ${url} ${targetPath}`);
    return NextResponse.json({ status: "success", path: targetPath });
  } catch (error: any) {
    return NextResponse.json({ error: true, message: error.message }, { status: 500 });
  }
}
