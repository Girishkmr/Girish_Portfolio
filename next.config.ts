import type { NextConfig } from 'next';

/**
 * The Supabase storage host, derived from the same env var the clients use so
 * the two cannot disagree. `next/image` refuses any remote host not listed
 * here — by design, since an open image proxy is a bandwidth bill waiting to
 * happen — and the gallery serves every photo from Storage.
 *
 * Parsed defensively: a missing or malformed URL must not break the build on a
 * machine with no credentials, which is the state the whole project is written
 * to survive.
 */
function supabaseImageHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const host = supabaseImageHost();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: host
      ? [
          {
            protocol: 'https',
            hostname: host,
            // Scoped to the public object path. A pattern of `/**` would also
            // cover signed and authenticated endpoints, which have no business
            // being fetched by the image optimiser.
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
};

export default nextConfig;
