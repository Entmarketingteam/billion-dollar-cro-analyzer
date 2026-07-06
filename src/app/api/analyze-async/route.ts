import { NextRequest, NextResponse } from 'next/server';
import { createTestRun } from '@/lib/db';
import { runAnalysisJob } from '@/lib/test-runner';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { siteId } = body;

  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }

  const testRun = await createTestRun(siteId);

  // Fire and forget — do NOT await
  runAnalysisJob(testRun.id).catch((err) => {
    console.error('runAnalysisJob error:', err);
  });

  return NextResponse.json({ testRunId: testRun.id, status: 'pending' }, { status: 202 });
}
