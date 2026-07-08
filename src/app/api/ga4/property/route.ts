import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/db";
import { getUserFromCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId, propertyId } = await request.json();
  if (!siteId || !propertyId || !/^\d+$/.test(String(propertyId))) {
    return NextResponse.json(
      { error: "siteId and numeric propertyId required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("sites")
    .update({ ga4_property_id: String(propertyId) })
    .eq("id", siteId);

  if (error) {
    console.error("GA4 property save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
