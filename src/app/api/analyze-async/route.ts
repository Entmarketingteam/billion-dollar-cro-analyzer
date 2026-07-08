import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createTestRun } from '@/lib/db';
import { runAnalysisJob } from '@/lib/test-runner';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { siteId } = body;

  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }

  const testRun = await createTestRun(siteId);

  const job = runAnalysisJob(testRun.id).catch((err) => {
    console.error('runAnalysisJob error:', err);
  });

  // Keep the serverless function alive until the job finishes; a bare
  // fire-and-forget promise gets killed when the response is sent.
  try {
    waitUntil(job);
  } catch {
    // Local dev outside the Vercel runtime: fire-and-forget is fine.
  }

  return NextResponse.json({ testRunId: testRun.id, status: 'pending' }, { status: 202 });
}
