import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * Applied to every response rather than a subset, because the cheapest way to
 * get this wrong is to protect the pages you remembered. The CSP is written
 * against what this app actually loads and is verified against a production
 * build — an over-strict policy that breaks the product protects nobody.
 */
const csp = [
  "default-src 'self'",
  // Next's inlined bootstrap and the streaming payload both need 'inline'.
  // 'unsafe-eval' is dev-only (React Refresh); it is absent in production.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // The only outbound calls the browser makes are to this origin.
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing in this product needs a camera stream, a location or a
          // microphone. Documents are chosen through a file input.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
