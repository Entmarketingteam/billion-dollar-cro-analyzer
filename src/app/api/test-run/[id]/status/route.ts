import { NextRequest, NextResponse } from 'next/server';
import { getTestRun } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const testRun = await getTestRun(id);
    return NextResponse.json(testRun);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'not found';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
