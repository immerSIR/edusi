"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { UserPlus, MessageCircle, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"child" | "whatsapp" | "done">("child");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("children").insert({
        parent_id: user.id,
        name: childName,
        age: parseInt(childAge),
      });
      if (error) throw error;
      setStep("whatsapp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add child");
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ whatsapp_number: whatsappNumber })
        .eq("id", user.id);
      if (error) throw error;
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to link WhatsApp");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className={`w-3 h-3 rounded-full ${
              step === "child" ? "bg-primary" : "bg-success"
            }`}
          />
          <div className="w-8 h-0.5 bg-primary/20" />
          <div
            className={`w-3 h-3 rounded-full ${
              step === "whatsapp" ? "bg-primary" : "bg-primary/20"
            }`}
          />
        </div>

        {step === "child" && (
          <>
            <div className="text-center mb-6">
              <UserPlus className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-primary">
                Add Your Child
              </h1>
              <p className="text-text-secondary text-sm">
                Fi omo re kun
              </p>
            </div>

            <form onSubmit={handleAddChild} className="space-y-4">
              <input
                type="text"
                placeholder="Child's name"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-surface border border-primary/20 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="number"
                placeholder="Age"
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                required
                min={3}
                max={16}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-primary/20 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {error && (
                <p className="text-error text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Adding..." : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        )}

        {step === "whatsapp" && (
          <>
            <div className="text-center mb-6">
              <MessageCircle className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-primary">
                Link WhatsApp
              </h1>
              <p className="text-text-secondary text-sm">
                So WhatsApp re po
              </p>
            </div>

            <form onSubmit={handleLinkWhatsApp} className="space-y-4">
              <input
                type="tel"
                placeholder="+234 800 000 0000"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-surface border border-primary/20 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {error && (
                <p className="text-error text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                {loading ? "Linking..." : "Link WhatsApp"}
              </button>
            </form>

            <button
              onClick={() => setStep("done")}
              className="w-full mt-3 py-3 text-text-secondary text-sm hover:text-primary transition-colors"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
