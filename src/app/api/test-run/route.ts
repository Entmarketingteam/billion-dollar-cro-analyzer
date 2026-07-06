import { NextRequest, NextResponse } from 'next/server';
import { listTestRunsBySite } from '@/lib/db';

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');

  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }

  try {
    const runs = await listTestRunsBySite(siteId);
    return NextResponse.json(runs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
