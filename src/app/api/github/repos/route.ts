import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  const session = (await getServerSession(authOptions)) as any

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch repositories")
    }

    const repos = await response.json()
    return NextResponse.json(repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      default_branch: repo.default_branch
    })))
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 })
  }
}
