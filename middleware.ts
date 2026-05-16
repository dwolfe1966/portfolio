import { NextRequest, NextResponse } from "next/server";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionTokenEdge } from "@/lib/account-session-edge";

const PUBLIC_PREFIXES = ["/projects", "/workspace/login", "/workspace/register", "/workspace/landing"];

const PROTECTED_PREFIXES = [
  "/workspace/account",
  "/workspace/agents",
  "/workspace/activity",
  "/workspace/connections",
  "/workspace/dashboard",
  "/workspace/datasets",
  "/workspace/report",
  "/workspace/settings"
];

function isProtectedPath(pathname: string) {
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return false;
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (await verifyAccountSessionTokenEdge(token)) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/workspace/login";
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/workspace/:path*"
  ]
};
