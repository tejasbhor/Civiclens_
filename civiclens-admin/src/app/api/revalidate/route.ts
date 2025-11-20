import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API route for on-demand cache revalidation
 * 
 * Usage:
 * POST /api/revalidate?secret=YOUR_SECRET&tag=dashboard-stats
 * 
 * Available tags:
 * - dashboard-stats
 * - department-stats
 * - officer-stats
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const tag = request.nextUrl.searchParams.get('tag');

  // Verify secret to prevent unauthorized revalidation
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { message: 'Invalid secret' },
      { status: 401 }
    );
  }

  if (!tag) {
    return NextResponse.json(
      { message: 'Missing tag parameter' },
      { status: 400 }
    );
  }

  // Validate tag
  const validTags = ['dashboard-stats', 'department-stats', 'officer-stats'];
  if (!validTags.includes(tag)) {
    return NextResponse.json(
      { message: `Invalid tag. Must be one of: ${validTags.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    revalidateTag(tag);
    return NextResponse.json({
      revalidated: true,
      tag,
      timestamp: new Date().toISOString(),
      message: `Successfully revalidated cache for tag: ${tag}`
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Error revalidating cache',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Handle GET requests with helpful information
export async function GET() {
  return NextResponse.json({
    message: 'Cache Revalidation API',
    usage: 'POST /api/revalidate?secret=YOUR_SECRET&tag=TAG_NAME',
    availableTags: [
      'dashboard-stats',
      'department-stats',
      'officer-stats'
    ],
    note: 'Requires REVALIDATION_SECRET environment variable'
  });
}
