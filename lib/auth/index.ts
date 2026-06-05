import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';

// Phase 1/2: skeleton providers only. The Drizzle adapter wiring is deferred
// to Phase 8 because the @auth/drizzle-adapter does its own db introspection
// at module-evaluation time; the lazy db singleton is added in Phase 8 along
// with role-based callbacks (user / business_owner / admin) and rate limits
// on the sign-in route.

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/business/dashboard');
      if (isOnDashboard) return isLoggedIn;
      return true;
    },
  },
});
