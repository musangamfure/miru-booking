import { auth } from "./auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // If already authenticated, allow through
  if (req.auth) return;

  // If going to login page, allow through
  if (pathname === "/login") return;

  // Redirect unauthenticated users to login
  const loginUrl = new URL("/login", req.url);
  return Response.redirect(loginUrl);
});

export const config = {
  matcher: [
    // Exclude: static files, Next.js internals, auth API routes, and /login itself
    "/((?!_next/static|_next/image|favicon.ico|api/auth|login).*)",
  ],
};
