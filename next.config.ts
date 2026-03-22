import type { NextConfig } from "next";

const cmsUrl = process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL ?? "";

const nextConfig: NextConfig = {
  /**
   * Allow the Optimizely CMS to embed this site in an iframe for Visual Builder.
   * Without the Content-Security-Policy frame-ancestors directive, the on-page
   * editor iframe will be blocked by the browser.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${cmsUrl}`,
          },
        ],
      },
    ];
  },

  /**
   * Redirect CMS-generated preview URLs to the Next.js draft mode handler.
   * When an editor clicks "Preview" in the CMS, Optimizely navigates to
   * /episerver/CMS/Content/... — this redirect routes it to our API handler.
   */
  async redirects() {
    return [
      {
        source: "/episerver/CMS/Content/:slug*",
        destination: "/api/draft/:slug*",
        permanent: false,
      },
    ];
  },

  /**
   * Allow Next.js Image to load images from the Optimizely CMS and Graph CDN.
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cms.optimizely.com",
      },
      {
        protocol: "https",
        hostname: "cg.optimizely.com",
      },
    ],
  },
};

export default nextConfig;
