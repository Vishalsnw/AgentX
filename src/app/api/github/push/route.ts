import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { message, files } = await req.json();
    
    const githubToken = (session as any).accessToken;
    const owner = (session as any).user?.githubUsername || (session as any).user?.name?.split(' ').join('-').toLowerCase() || process.env.GITHUB_OWNER || 'vishal-projects';
    const repo = 'agent-x'; 
    const branchName = 'main';
    
    console.log(`Push attempt details: Owner=${owner}, Repo=${repo}, Branch=${branchName}, TokenExists=${!!githubToken}`);

    if (!githubToken) {
      return NextResponse.json({ error: "No GitHub token found in session" }, { status: 401 });
    }

    // 1. Get the latest commit SHA of the specified branch
    const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branchName}`, {
      headers: { 
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!branchRes.ok) {
      const errorMsg = await branchRes.text();
      console.error(`GitHub Branch Error (${branchName}):`, errorMsg);
      return NextResponse.json({ error: `GitHub branch error (${branchName}): ${branchRes.status} ${errorMsg}` }, { status: branchRes.status });
    }

    const branchData = await branchRes.json();
    
    if (!branchData.commit || !branchData.commit.commit || !branchData.commit.commit.tree) {
      console.error('Unexpected GitHub branch response structure:', branchData);
      return NextResponse.json({ error: "Unexpected GitHub API response structure when reading branch" }, { status: 500 });
    }

    const baseTree = branchData.commit.commit.tree.sha;
    const parentCommit = branchData.commit.sha;

    // 2. Create blobs for each file
    const treeItems = [];
    for (const file of files) {
      if (file.type === 'file') {
        const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${githubToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: file.content || '',
            encoding: 'utf-8'
          })
        });
        const blobData = await blobRes.json();
        treeItems.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha
        });
      }
    }

    // 3. Create a new tree
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base_tree: baseTree,
        tree: treeItems
      })
    });
    const treeData = await treeRes.json();

    // 4. Create a commit
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [parentCommit]
      })
    });
    const commitData = await commitRes.json();

    // 5. Update the reference
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branchName}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sha: commitData.sha,
        force: true
      })
    });

    if (!refRes.ok) {
      const errorMsg = await refRes.text();
      console.error('GitHub Ref Update Error:', errorMsg);
      return NextResponse.json({ error: `GitHub ref update error: ${refRes.status} ${errorMsg}` }, { status: refRes.status });
    }

    return NextResponse.json({ 
      success: true, 
      sha: commitData.sha
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
