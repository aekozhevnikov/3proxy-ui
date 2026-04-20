import { NextResponse } from "next/server";

/**
 * Runtime proxy configuration API
 * Returns the current proxy domain and ports from environment variables.
 * These can be changed at runtime without rebuilding the image.
 */
export async function GET() {
    const config = {
        domain: process.env.PROXY_DOMAIN || "localhost",
        httpPort: process.env.HTTP_PORT || "3128",
        socksPort: process.env.SOCKS_PORT || "1080"
    };

    return NextResponse.json(config);
}
