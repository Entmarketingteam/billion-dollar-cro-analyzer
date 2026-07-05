import { cookies } from "next/headers";

export type ValidUser = "emily" | "ethan";

const COOKIE_NAME = "cro_user";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export function isValidUser(user: string): user is ValidUser {
  return user === "emily" || user === "ethan";
}

export async function setUserCookie(user: ValidUser): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, user, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getUserFromCookie(): Promise<ValidUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value || !isValidUser(value)) return null;
  return value;
}

export async function clearUserCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
