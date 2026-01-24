import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  console.log(`POST ${req.nextUrl.pathname}`);
  try {
    const { command } = await req.json();
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const { stdout, stderr } = await execPromise(command, { timeout: 30000 });
    return NextResponse.json({ stdout, stderr, code: 0 });
  } catch (error: any) {
    return NextResponse.json({ 
      stdout: error.stdout || '', 
      stderr: error.stderr || error.message, 
      code: error.code || 1 
    });
  }
}
