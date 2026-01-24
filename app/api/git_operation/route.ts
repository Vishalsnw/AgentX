import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  console.log(`POST ${req.nextUrl.pathname}`);
  try {
    const { operation, path, message } = await req.json();
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    if (operation === 'pull') {
      await execPromise(`git -C ${path} pull`);
    } else if (operation === 'push') {
      await execPromise(`git -C ${path} config user.email "agent@replica.com"`);
      await execPromise(`git -C ${path} config user.name "Agent"`);
      await execPromise(`git -C ${path} add .`);
      await execPromise(`git -C ${path} commit -m "${message || 'Update'}"`);
      await execPromise(`git -C ${path} push`);
    }
    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    return NextResponse.json({ error: true, message: error.message }, { status: 500 });
  }
}
