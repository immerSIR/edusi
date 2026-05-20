"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  UserPlus,
  MessageCircle,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { computeAge } from "@/lib/utils";
import { computeInitialLevel, suggestGrade } from "@/lib/level-assessment";
import { useSound } from "@/contexts/SoundContext";
import { useChild } from "@/contexts/ChildContext";

const GRADE_OPTIONS = [
  { value: "nursery_1", label: "Nursery 1" },
  { value: "nursery_2", label: "Nursery 2" },
  { value: "primary_1", label: "Primary 1" },
  { value: "primary_2", label: "Primary 2" },
  { value: "primary_3", label: "Primary 3" },
  { value: "primary_4", label: "Primary 4" },
  { value: "primary_5", label: "Primary 5" },
  { value: "primary_6", label: "Primary 6" },
  { value: "jss_1", label: "JSS 1" },
  { value: "jss_2", label: "JSS 2" },
  { value: "jss_3", label: "JSS 3" },
  { value: "sss_1", label: "SSS 1" },
  { value: "sss_2", label: "SSS 2" },
  { value: "sss_3", label: "SSS 3" },
  { value: "not_in_school", label: "Not in school" },
];

const ENGLISH_OPTIONS = [
  { value: "none", label: "None", desc: "Does not understand English" },
  { value: "basic", label: "Basic", desc: "Understands simple words and phrases" },
  { value: "intermediate", label: "Intermediate", desc: "Can hold simple conversations" },
  { value: "fluent", label: "Fluent", desc: "Speaks English comfortably" },
];

const TECH_OPTIONS = [
  { value: "none", label: "None", desc: "Has never used a phone or computer" },
  { value: "basic", label: "Basic", desc: "Can use a phone for calls/video" },
  { value: "moderate", label: "Moderate", desc: "Uses apps, games, or YouTube" },
  { value: "comfortable", label: "Comfortable", desc: "Navigates devices independently" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { play: playSound } = useSound();
  const { children: existingChildren, refreshChildren } = useChild();
  const [step, setStep] = useState<"child" | "details" | "whatsapp" | "done">("child");

  // Step 1
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");

  // Step 2
  const [schoolGrade, setSchoolGrade] = useState("");
  const [englishProficiency, setEnglishProficiency] = useState("basic");
  const [techFamiliarity, setTechFamiliarity] = useState("none");

  // Step 3
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 2-child guard: redirect if already at limit
  useEffect(() => {
    if (existingChildren.length >= 2) {
      router.push("/dashboard");
    }
  }, [existingChildren, router]);

  // Compute age from DOB for display and grade suggestion
  const computedAge = useMemo(() => {
    if (!childDob) return null;
    return computeAge(childDob);
  }, [childDob]);

  // Date bounds for DOB input (3-16 years old)
  const dobMin = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 16);
    return d.toISOString().split("T")[0];
  }, []);
  const dobMax = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().split("T")[0];
  }, []);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!childDob || computedAge === null || computedAge < 3 || computedAge > 16) {
      setError("Please enter a valid date of birth (child must be 3-16 years old)");
      return;
    }
    playSound("tap");
    setError("");
    if (!schoolGrade) {
      setSchoolGrade(suggestGrade(computedAge));
    }
    setStep("details");
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    playSound("tap");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const level = computeInitialLevel(schoolGrade, englishProficiency, techFamiliarity);

      const { error: insertError } = await supabase.from("children").insert({
        parent_id: user.id,
        name: childName.trim(),
        date_of_birth: childDob,
        school_grade: schoolGrade,
        english_proficiency: englishProficiency,
        tech_familiarity: techFamiliarity,
        current_level: level,
      });

      if (insertError) {
        if (insertError.message.includes("Maximum of 2 children")) {
          throw new Error("You can add a maximum of 2 children.");
        }
        throw insertError;
      }

      playSound("complete");
      await refreshChildren();
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

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ whatsapp_number: whatsappNumber })
        .eq("id", user.id);
      if (updateError) throw updateError;
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to link WhatsApp");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (step === "done") {
      router.push("/dashboard");
    }
  }, [step, router]);

  if (step === "done") return null;

  const steps = ["child", "details", "whatsapp"] as const;
  const currentStepIndex = steps.indexOf(step as (typeof steps)[number]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  i < currentStepIndex
                    ? "bg-success"
                    : i === currentStepIndex
                      ? "bg-primary"
                      : "bg-primary/20"
                }`}
              />
              {i < steps.length - 1 && <div className="w-8 h-0.5 bg-primary/20" />}
            </div>
          ))}
        </div>

        {/* Step 1: Name + Date of Birth */}
        {step === "child" && (
          <>
            <div className="text-center mb-6">
              <UserPlus className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-primary">About Your Child</h1>
              <p className="text-text-secondary text-sm">Sọ fun wa nipa ọmọ rẹ</p>
            </div>

            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Child&apos;s Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Adebayo"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-primary/20 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={childDob}
                  onChange={(e) => setChildDob(e.target.value)}
                  required
                  min={dobMin}
                  max={dobMax}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-primary/20 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {computedAge !== null && (
                  <p className="text-xs text-primary font-medium mt-1.5">
                    Age: {computedAge} years old
                  </p>
                )}
              </div>

              {error && <p className="text-error text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={!childName.trim() || !childDob}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        )}

        {/* Step 2: Learning Profile */}
        {step === "details" && (
          <>
            <div className="text-center mb-6">
              <GraduationCap className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-primary">Learning Profile</h1>
              <p className="text-text-secondary text-sm">
                This helps us personalize {childName}&apos;s experience
              </p>
            </div>

            <form onSubmit={handleStep2} className="space-y-5">
              {/* School Grade */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  School Grade
                </label>
                <select
                  value={schoolGrade}
                  onChange={(e) => {
                    playSound("tap");
                    setSchoolGrade(e.target.value);
                  }}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-primary/20 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="" disabled>
                    Select grade...
                  </option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* English Proficiency */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  English Level
                </label>
                <div className="space-y-2">
                  {ENGLISH_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        englishProficiency === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-primary/10 bg-surface"
                      }`}
                    >
                      <input
                        type="radio"
                        name="english"
                        value={opt.value}
                        checked={englishProficiency === opt.value}
                        onChange={(e) => {
                          playSound("tap");
                          setEnglishProficiency(e.target.value);
                        }}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                        <p className="text-xs text-text-secondary">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tech Familiarity */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Technology Experience
                </label>
                <div className="space-y-2">
                  {TECH_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        techFamiliarity === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-primary/10 bg-surface"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tech"
                        value={opt.value}
                        checked={techFamiliarity === opt.value}
                        onChange={(e) => {
                          playSound("tap");
                          setTechFamiliarity(e.target.value);
                        }}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                        <p className="text-xs text-text-secondary">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="text-error text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || !schoolGrade}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Creating profile..." : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        )}

        {/* Step 3: WhatsApp */}
        {step === "whatsapp" && (
          <>
            <div className="text-center mb-6">
              <MessageCircle className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-primary">Link WhatsApp</h1>
              <p className="text-text-secondary text-sm">So WhatsApp re po</p>
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

              {error && <p className="text-error text-sm text-center">{error}</p>}

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
