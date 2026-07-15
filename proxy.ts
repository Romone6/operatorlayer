import { NextResponse, type NextRequest } from "next/server";

function makeTraceId() {
  return globalThis.crypto.randomUUID();
}

export function proxy(request: NextRequest) {
  const traceId = request.headers.get("x-operatorlayer-trace-id") ?? makeTraceId();
  const response = NextResponse.next();
  response.headers.set("x-operatorlayer-trace-id", traceId);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-xss-protection", "0");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? "script-src 'self' 'unsafe-inline';"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval';";
  response.headers.set(
    "content-security-policy",
    `default-src 'self'; ${scriptSrc} style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';`
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
