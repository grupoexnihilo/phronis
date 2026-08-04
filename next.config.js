// next.config.js
import 'dotenv/config.js';

export default {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};
