import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"

export const authOptions: any = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET!,
    }),
  ],
  debug: true,
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev',
  useSecureCookies: false,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: false
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false
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
    async signIn({ user, account, profile }: any) {
      console.log('SignIn Callback:', { user, account, profile });
      return true;
    },
    async jwt({ token, account, profile }: any) {
      console.log('JWT Callback:', { hasAccount: !!account, hasProfile: !!profile });
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }: any) {
      console.log('Session Callback:', { hasAccessToken: !!token.accessToken });
      session.accessToken = token.accessToken
      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
