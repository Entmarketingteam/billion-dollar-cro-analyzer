import { NextRequest, NextResponse } from "next/server";
import { isValidUser, setUserCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { user } = await request.json();

  if (!isValidUser(user)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  await setUserCookie(user);
  return NextResponse.json({ success: true });
}
