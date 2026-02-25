import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  if (pathname === "/blog") {
    const rawPage = searchParams.get("page");
    if (!rawPage) {
      return NextResponse.next();
    }

    if (!/^\d+$/.test(rawPage)) {
      return NextResponse.next();
    }

    const parsedPage = Number(rawPage);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return NextResponse.next();
    }

    const destination = request.nextUrl.clone();
    destination.pathname = parsedPage === 1 ? "/blog" : `/blog/page/${parsedPage}`;
    destination.search = "";
    return NextResponse.redirect(destination, 308);
  }

  const strapiUrl = process.env.STRAPI_URL?.trim() || "http://localhost:1337";
  const destination = new URL(`${pathname.replace("/cms-uploads", "/uploads")}${search}`, strapiUrl);
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: ["/blog", "/cms-uploads/:path*"],
};
