import type { NextConfig } from "next";

/**
 * Strict, defence-in-depth response headers.
 *
 * Rationale (security audit):
 *   - The app stores menstrual-cycle data in `localStorage`. A successful
 *     XSS would exfiltrate that data — CSP is the most important mitigation.
 *   - The app makes zero network requests after page load. We pin
 *     `connect-src` and `default-src` to `self` to prevent any future
 *     accidental beacon / fetch / form-action leakage.
 *   - We disable browser features the app does not use (geolocation, camera,
 *     microphone, USB, FLoC/Topics) so a future XSS cannot trigger them.
 *   - `Referrer-Policy: no-referrer` keeps the app URL out of outbound
 *     requests' Referer headers (privacy posture).
 *
 * `'unsafe-inline'` is unavoidable for Next.js' inline hydration script
 * and for driver.js' inline tour styling. We accept it but lock down
 * everything else.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js hydration script + inline JSON; driver.js inline styles bleed
      // into <head> via the imported CSS so we additionally allow style inline.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // PNG export via html-to-image produces data: URLs; allow data + blob.
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "browsing-topics=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "interest-cohort=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "sync-xhr=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
