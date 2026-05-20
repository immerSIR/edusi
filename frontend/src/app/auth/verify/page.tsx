"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });
      if (error) throw error;
      router.push("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold text-primary text-center mb-1">
        Enter Code
      </h1>
      <p className="text-text-secondary text-center text-sm mb-6">
        We sent a code to {phone}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          maxLength={6}
          className="w-full px-4 py-3 rounded-xl bg-surface border border-primary/20 text-text-primary text-center text-2xl tracking-[0.5em] placeholder:tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {error && <p className="text-error text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <Suspense
        fallback={
          <p className="text-text-secondary">Loading...</p>
        }
      >
        <VerifyForm />
      </Suspense>
    </div>
  );
}
