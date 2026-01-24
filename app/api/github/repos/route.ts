import { NextResponse, NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  console.log(`GET ${req.nextUrl.pathname}`);
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || process.env.GITHUB_TOKEN_SECRET;
    if (!token) return NextResponse.json({ error: true, message: "No token" }, { status: 401 });
    
    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: { "Accept": "application/vnd.github.v3+json", "Authorization": `token ${token}` }
    });
    const data = await res.json();
    if (res.ok) return NextResponse.json(data.map((r: any) => ({ name: r.full_name, url: r.html_url })));
    return NextResponse.json({ error: true, message: data.message || 'Error' }, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: true, message: error.message }, { status: 500 });
  }
}
