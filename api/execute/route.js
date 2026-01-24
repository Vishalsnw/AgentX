export async function POST(req) {
  try {
    const { command } = await req.json();
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const { stdout, stderr } = await execPromise(command, { timeout: 30000 });
    return Response.json({ stdout, stderr, code: 0 });
  } catch (error) {
    return Response.json({ 
      stdout: error.stdout || '', 
      stderr: error.stderr || error.message, 
      code: error.code || 1 
    });
  }
}
