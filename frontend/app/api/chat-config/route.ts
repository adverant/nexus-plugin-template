/**
 * BFF route for chat config — proxies to TSE service.
 * Server-side only: INTERNAL_SERVICE_KEY never exposed to browser.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const tseUrl = process.env.TSE_SERVICE_URL || 'http://nexus-tse:8095';
  const serviceKey = process.env.INTERNAL_SERVICE_KEY;

  if (!serviceKey) {
    return NextResponse.json(
      {
        error: true,
        code: 'SERVICE_KEY_NOT_CONFIGURED',
        message: 'INTERNAL_SERVICE_KEY is not configured on this deployment.',
        troubleshooting: [
          'Set INTERNAL_SERVICE_KEY env var on the K8s deployment',
          'The key must match the nexus-tse service\'s INTERNAL_SERVICE_KEY',
        ],
      },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${tseUrl}/api/v1/chat-config`, {
      headers: {
        'X-Service-Key': serviceKey,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error: true,
          code: 'TSE_FETCH_FAILED',
          message: `TSE service returned ${res.status}: ${res.statusText}`,
          troubleshooting: [
            `Check TSE service health: curl ${tseUrl}/health`,
            'Verify TSE_SERVICE_URL is correct',
            'Verify INTERNAL_SERVICE_KEY matches',
          ],
        },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: true,
        code: 'TSE_UNREACHABLE',
        message: `Failed to reach TSE service at ${tseUrl}: ${(err as Error).message}`,
        troubleshooting: [
          `Verify TSE pod is running: kubectl get pods -n nexus -l app=nexus-tse`,
          `Verify NetworkPolicy allows egress to nexus-tse`,
          `Check TSE_SERVICE_URL env var (current: ${tseUrl})`,
        ],
      },
      { status: 503 }
    );
  }
}
