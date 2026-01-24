export async function GET() {
  const client_id = process.env.GITHUB_CLIENT_ID || "Ov23lipwgA5vPc0x7HbV";
  const redirect_uri = process.env.REDIRECT_URI || "https://agent-x-tawny.vercel.app/api/github/callback";
  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=repo,user`;
  return Response.json({ url });
}
