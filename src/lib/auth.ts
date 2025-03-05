import NextAuth from 'next-auth';
import type { AuthOptions, DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      pan?: string;
      phone?: string | undefined;
      dateOfBirth?: Date;
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    email: string;
    name: string;
    pan?: string;
    phone?: string | undefined;
    dateOfBirth?: Date;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email.toLowerCase(),
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            password: true,
            pan: true,
            phone: true,
            dateOfBirth: true,
          }
        });

        if (!user) {
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          pan: user.pan,
          phone: user.phone || undefined,  // Changed from null to undefined to match the type
          dateOfBirth: user.dateOfBirth,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login', // Changed from '/' to '/login'
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.pan = user.pan;
        token.phone = user.phone;
        token.dateOfBirth = user.dateOfBirth;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.pan = token.pan as string;
        session.user.phone = token.phone as string | undefined;
        session.user.dateOfBirth = token.dateOfBirth as Date | undefined;
      }
      return session;
    },
    async signOut() {
      return { redirect: '/login' }
    },
  },
};

const handler = NextAuth(authOptions);
export const auth = () => getServerSession(authOptions);
export const { signIn, signOut } = handler;
export { handler as default, handler as GET, handler as POST };