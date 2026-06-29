import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import db from "../../../../lib/db";
import bcrypt from "bcryptjs";

// Hash of a throwaway password; compared when the email doesn't exist so the
// response time doesn't reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer-not-a-real-password", 10);

// Simple in-memory limiter per email: 5 failed attempts per 15 minutes.
// Per-process only - replace with a shared store if this ever scales out.
const failedLogins = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(email) {
  const entry = failedLogins.get(email);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failedLogins.delete(email);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(email) {
  const entry = failedLogins.get(email);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    failedLogins.set(email, { count: 1, first: Date.now() });
  } else {
    entry.count++;
  }
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Normalize so logins match regardless of case/whitespace ("User@X" == "user@x")
        const email = credentials.email.trim().toLowerCase();
        if (isRateLimited(email)) return null;

        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

        // Always run a compare so "unknown email" and "wrong password"
        // take the same time.
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user ? user.password : DUMMY_HASH
        );

        if (!user || !isPasswordCorrect) {
          recordFailure(email);
          return null;
        }

        failedLogins.delete(email);
        return {
          id: user.id.toString(), // NextAuth expects 'id' as a string
          email: user.email,
          name: user.name,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        return token;
      }
      if (!token.id) return token;

      if (trigger === "update") {
        // Re-fetch latest name/email from Database after profile update
        const freshUser = db.prepare("SELECT name, email FROM users WHERE id = ?").get(Number(token.id));
        if (!freshUser) {
          token.invalid = true;
        } else {
          token.name = freshUser.name;
          token.email = freshUser.email;
        }
        return token;
      }

      // Invalidate tokens whose account no longer exists (deleted account)
      const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(Number(token.id));
      if (!exists) token.invalid = true;
      return token;
    },
    async session({ session, token }) {
      if (token.invalid) return null;
      if (session?.user) {
        session.user.id = token.id;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
      }
      return session;
    }
  },
  session: { strategy: "jwt" },
  pages: { signIn: "/login" }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };