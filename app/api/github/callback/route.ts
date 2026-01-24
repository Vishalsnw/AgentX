import { NextResponse, NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  console.log(`GET ${req.nextUrl.pathname}`);
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const client_id = process.env.GITHUB_CLIENT_ID || "Ov23lipwgA5vPc0x7HbV";
    const client_secret = process.env.GITHUB_CLIENT_SECRET || "9d890e753b9806d6cc6269016de5a9dc35684a3f";
    const redirect_uri = process.env.REDIRECT_URI || "https://agent-x-tawny.vercel.app/api/github/callback";
    
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: 'POST',
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id, client_secret, code, redirect_uri })
    });
    const data = await res.json();
    const token = data.access_token;
    
    if (token) {
      const html = `<html><script>if(window.opener){window.opener.postMessage({type:'github-token',token:'${token}'},'*');setTimeout(()=>window.close(),1000);}else{document.body.innerHTML='Login successful!';}</script><body>Authenticating...</body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
    return NextResponse.json({ error: true, message: data.error_description || 'Auth failed' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: true, message: error.message }, { status: 500 });
  }
}
