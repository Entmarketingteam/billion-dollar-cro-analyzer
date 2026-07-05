"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ValidUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<ValidUser | null>(null);

  async function handleLogin(user: ValidUser) {
    setLoading(user);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Login failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      alert("Network error — please try again");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-500">Select your account to continue</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => handleLogin("emily")}
          disabled={loading !== null}
          className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
        >
          {loading === "emily" ? "Signing in..." : "Login as Emily"}
        </button>

        <button
          onClick={() => handleLogin("ethan")}
          disabled={loading !== null}
          className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
        >
          {loading === "ethan" ? "Signing in..." : "Login as Ethan"}
        </button>
      </div>
    </div>
  );
}
