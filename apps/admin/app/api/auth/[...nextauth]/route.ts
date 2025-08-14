import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';

const handler = NextAuth({
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST || 'localhost',
        port: parseInt(process.env.EMAIL_SERVER_PORT || '2525', 10),
        auth: { user: process.env.EMAIL_SERVER_USER || 'user', pass: process.env.EMAIL_SERVER_PASSWORD || 'pass' }
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      async sendVerificationRequest(params) {
        console.log('NextAuth magic link for', params.identifier, '=>', params.url);
        try { (globalThis as any).__lastMagicURL = params.url; } catch {}
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
});

export { handler as GET, handler as POST };

