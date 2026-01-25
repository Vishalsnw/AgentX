import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"

export const authOptions: any = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  debug: true,
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    }
  },
  logger: {
    error(code: string, metadata: any) {
      console.error('NextAuth Error:', { code, metadata, 
        env: {
          NEXTAUTH_URL: process.env.NEXTAUTH_URL,
          GITHUB_CLIENT_ID: !!(process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID),
          GITHUB_CLIENT_SECRET: !!(process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET),
          NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET
        }
      })
    },
    warn(code: string) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code: string, metadata: any) {
      console.log('NextAuth Debug:', { code, metadata })
    },
  },
  callbacks: {
    async jwt({ token, account }: any) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken
      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
