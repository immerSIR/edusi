"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/contexts/ChildContext";
import { useSound } from "@/contexts/SoundContext";
import {
  LogOut,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  BookOpen,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
  const router = useRouter();
  const {
    child,
    children: allChildren,
    loading,
    switchChild,
    refreshChild,
    refreshChildren,
  } = useChild();
  const { enabled, setEnabled, play } = useSound();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleLogout() {
    play("tap");
    await supabase.auth.signOut();
    router.push("/");
  }

  function startEditing() {
    if (!child) return;
    play("tap");
    setEditName(child.name);
    setEditDob(child.date_of_birth);
    setEditing(true);
  }

  async function saveEdit() {
    if (!child || saving) return;
    setSaving(true);
    play("tap");

    if (!editName.trim() || !editDob) {
      setSaving(false);
      return;
    }

    await supabase
      .from("children")
      .update({ name: editName.trim(), date_of_birth: editDob })
      .eq("id", child.id);

    await refreshChild();
    play("complete");
    setEditing(false);
    setSaving(false);
  }

  function cancelEdit() {
    play("tap");
    setEditing(false);
  }

  async function confirmDelete(childId: string) {
    play("tap");
    setDeleting(childId);
  }

  async function executeDelete() {
    if (!deleting) return;
    play("tap");

    await supabase.from("lesson_progress").delete().eq("child_id", deleting);
    await supabase.from("children").delete().eq("id", deleting);

    setDeleting(null);
    await refreshChildren();
    play("complete");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="bg-primary text-white px-4 py-3">
        <h1 className="text-lg font-bold">Profile</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-5">
        {/* Child Switcher */}
        {allChildren.length > 1 && (
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
              Switch Learner
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allChildren.map((c) => {
                const isActive = child?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      play("tap");
                      switchChild(c.id);
                    }}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border transition-all active:scale-95 ${
                      isActive
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-surface text-text-primary border-primary/15 hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Child Card */}
        {child && (
          <motion.div
            key={child.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">
                    {child.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-background border border-primary/20 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Name"
                      />
                      <input
                        type="date"
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-background border border-primary/20 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 bg-text-secondary/10 text-text-secondary rounded-lg text-xs font-medium"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-text-primary">
                        {child.name}
                      </h2>
                      <p className="text-sm text-text-secondary">
                        Age {child.age}
                      </p>
                    </>
                  )}
                </div>
                {!editing && (
                  <button
                    onClick={startEditing}
                    className="p-2 rounded-full hover:bg-primary/5 transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-text-secondary" />
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            {!editing && (
              <div className="grid grid-cols-3 border-t border-primary/10">
                <div className="p-3 text-center">
                  <Star className="w-5 h-5 text-accent mx-auto mb-1" />
                  <p className="text-sm font-semibold text-text-primary">
                    {child.total_points}
                  </p>
                  <p className="text-[10px] text-text-secondary">Points</p>
                </div>
                <div className="p-3 text-center border-x border-primary/10">
                  <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-sm font-semibold text-text-primary">
                    {child.current_level}
                  </p>
                  <p className="text-[10px] text-text-secondary">Level</p>
                </div>
                <div className="p-3 text-center">
                  <Target className="w-5 h-5 text-success mx-auto mb-1" />
                  <p className="text-sm font-semibold text-text-primary">
                    {child.age <= 6
                      ? "3-6"
                      : child.age <= 10
                        ? "7-10"
                        : "11-16"}
                  </p>
                  <p className="text-[10px] text-text-secondary">Age Group</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* All Children Management */}
        <div>
          <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
            Manage Children
          </p>
          <div className="space-y-2">
            {allChildren.map((c) => {
              const isActive = child?.id === c.id;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 bg-surface rounded-xl p-3 shadow-sm ${
                    isActive ? "ring-2 ring-primary/30" : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isActive
                        ? "bg-primary text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <span className="text-sm font-bold">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Age {c.age} &middot; {c.total_points} pts &middot; Level{" "}
                      {c.current_level}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isActive && (
                      <button
                        onClick={() => {
                          play("tap");
                          switchChild(c.id);
                        }}
                        className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        Select
                      </button>
                    )}
                    {isActive && (
                      <span className="px-2.5 py-1 bg-primary text-white rounded-lg text-xs font-medium">
                        Active
                      </span>
                    )}
                    {allChildren.length > 1 && (
                      <button
                        onClick={() => confirmDelete(c.id)}
                        className="p-1.5 rounded-lg hover:bg-error/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-error/60" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add child (hidden at 2-child limit) */}
            {allChildren.length < 2 && (
              <Link
                href="/onboarding"
                onClick={() => play("tap")}
                className="flex items-center gap-3 bg-surface rounded-xl p-3 shadow-sm border border-dashed border-primary/20 hover:border-primary/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-primary">
                  Add Another Child
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Quick action: Start Learning */}
        {child && (
          <Link
            href="/learn"
            onClick={() => play("tap")}
            className="flex items-center gap-3 bg-primary rounded-2xl p-4 shadow-sm hover:bg-primary-light transition-colors"
          >
            <BookOpen className="w-5 h-5 text-white" />
            <span className="text-sm font-medium text-white">
              Start Learning as {child.name}
            </span>
          </Link>
        )}

        {/* Sound toggle */}
        <button
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            if (next) play("tap");
          }}
          className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {enabled ? (
              <Volume2 className="w-5 h-5 text-primary" />
            ) : (
              <VolumeX className="w-5 h-5 text-error/60" />
            )}
            <span className="text-sm font-medium text-text-primary">
              Sound Effects
            </span>
          </div>
          <div
            className={`w-11 h-6 rounded-full transition-colors relative ${
              enabled ? "bg-primary" : "bg-text-secondary/30"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-surface rounded-2xl p-4 shadow-sm flex items-center gap-3 text-error"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Log Out</span>
        </button>
      </main>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {deleting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Remove Child?
              </h3>
              <p className="text-sm text-text-secondary mb-5">
                This will delete{" "}
                <strong>
                  {allChildren.find((c) => c.id === deleting)?.name}
                </strong>
                &apos;s profile and all their learning progress. This cannot be
                undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    play("tap");
                    setDeleting(null);
                  }}
                  className="flex-1 py-2.5 bg-text-secondary/10 text-text-primary rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-2.5 bg-error text-white rounded-xl text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
