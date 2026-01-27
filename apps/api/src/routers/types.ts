// Export only the router type for use by clients
// This avoids pulling in D1Database and other Cloudflare-specific types
export type { AppRouter } from "./index.js";
