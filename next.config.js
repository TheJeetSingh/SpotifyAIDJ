/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.scdn.co', 'platform-lookaside.fbsbx.com', 'mosaic.scdn.co'],
  },
  turbopack: {
    rules: {
      // Optional: Disable hashing URLs for better performance
      urlHashing: false,
    },
  },
};

module.exports = nextConfig; 