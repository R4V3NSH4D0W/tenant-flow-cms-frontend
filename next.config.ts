import type { NextConfig } from "next";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000";

/** Allow Next/Image to load assets from the Hono API (media, page previews, etc.). */
function backendApiImagePatterns(): Array<{
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
}> {
  const patterns: Array<{
    protocol: "http" | "https";
    hostname: string;
    port?: string;
    pathname: string;
  }> = [
    {
      protocol: "https",
      hostname: "demo.cms.devfy.codes",
      pathname: "/api/**",
    },
  ];

  const seen = new Set(
    patterns.map((p) => `${p.protocol}://${p.hostname}:${p.port ?? ""}`),
  );

  try {
    const base =
      API_URL.startsWith("http://") || API_URL.startsWith("https://")
        ? API_URL
        : `https://${API_URL}`;
    const u = new URL(base);
    const protocol = u.protocol === "https:" ? "https" : "http";
    const key = `${protocol}://${u.hostname}:${u.port ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      patterns.push({
        protocol,
        hostname: u.hostname,
        ...(u.port ? { port: u.port } : {}),
        pathname: "/api/**",
      });
    }
  } catch {
    // ignore invalid API_URL at build time
  }

  return patterns;
}

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  poweredByHeader: false,
  // Prisma / pg / bcrypt now live in the Hono backend only
  serverExternalPackages: ["pino", "pino-pretty"],
  experimental: {
    middlewareClientMaxBodySize: "100mb",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  images: {
    // Allow Next/Image optimizer to fetch local backend media during development.
    ...(process.env.NODE_ENV !== "production"
      ? { dangerouslyAllowLocalIP: true }
      : {}),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
        pathname: "/wiki/Special:FilePath/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Allow local Hono backend media during development
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/api/**",
      },
      ...backendApiImagePatterns(),
      {
        protocol: "https",
        hostname: "ng4mq8bt-3000.inc1.devtunnels.ms",
      },
    ],
  },
};

export default nextConfig;
