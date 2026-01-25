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
  secret: process.env.NEXTAUTH_SECRET || process.env.NEXT_PUBLIC_NEXTAUTH_SECRET || 'fallback-secret-for-dev-only-not-prod',
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.callback-url` : `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? `__Host-next-auth.csrf-token` : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  pages: {
    signIn: '/api/auth/signin',
    error: '/api/auth/error',
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
      console.log('SignIn Callback:', { 
        id: user?.id, 
        email: user?.email, 
        provider: account?.provider 
      });
      return true;
    },
    async jwt({ token, account }: any) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
