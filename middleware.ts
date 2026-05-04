import { NextRequest, NextResponse } from "next/server";
import { DEMO_ACCESS_COOKIE, isDemoAccessConfigured, isValidDemoAccessToken } from "@/lib/demo-access";

const PROTECTED_PREFIXES = [
  "/demo/dashboard",
  "/demo/activity",
  "/demo/connections",
  "/demo/datasets",
  "/demo/settings",
  "/lifecycle",
  "/acquisition",
  "/auction",
  "/pricing",
  "/retention",
  "/expansion"
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  if (!isDemoAccessConfigured()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(DEMO_ACCESS_COOKIE)?.value;
  if (await isValidDemoAccessToken(token)) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/demo/login";
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
    "/lifecycle/:path*",
    "/acquisition/:path*",
    "/auction/:path*",
    "/pricing/:path*",
    "/retention/:path*",
    "/expansion/:path*"
  ]
};
