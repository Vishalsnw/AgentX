export async function POST(req) {
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
    return Response.json({ status: "success", path: targetPath });
  } catch (error) {
    return Response.json({ error: true, message: error.message }, { status: 500 });
  }
}
