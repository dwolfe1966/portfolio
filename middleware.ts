import { NextRequest, NextResponse } from "next/server";
import { DEMO_ACCESS_COOKIE, isDemoAccessConfigured, isValidDemoAccessToken } from "@/lib/demo-access";

const PUBLIC_PREFIXES = ["/projects"];

const PROTECTED_PREFIXES = [
  "/workspace/dashboard",
  "/workspace/activity",
  "/workspace/connections",
  "/workspace/datasets",
  "/workspace/settings"
];

function isProtectedPath(pathname: string) {
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return false;
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  if (!isDemoAccessConfigured()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(DEMO_ACCESS_COOKIE)?.value;
  if (await isValidDemoAccessToken(token)) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/workspace/login";
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/demo/dashboard/:path*",
    "/demo/activity/:path*",
    "/demo/connections/:path*",
    "/demo/datasets/:path*",
    "/demo/settings/:path*",
    "/workspace/dashboard/:path*",
    "/workspace/activity/:path*",
    "/workspace/connections/:path*",
    "/workspace/datasets/:path*",
    "/workspace/settings/:path*"
  ]
};
