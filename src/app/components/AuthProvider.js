"use client";

import { SessionProvider } from "next-auth/react";

// SessionProvider needs the client runtime, so it's isolated here.
// This keeps layout.jsx a Server Component while still exposing the
// session to client components via useSession().
export default function AuthProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}