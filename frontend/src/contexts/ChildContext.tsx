"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Child, ChildWithAge } from "@/lib/types";
import { computeAge } from "@/lib/utils";

interface ChildContextValue {
  child: ChildWithAge | null;
  children: ChildWithAge[];
  loading: boolean;
  switchChild: (id: string) => void;
  refreshChild: () => Promise<void>;
  refreshChildren: () => Promise<void>;
}

const ChildContext = createContext<ChildContextValue | null>(null);

function enrichWithAge(c: Child): ChildWithAge {
  return { ...c, age: computeAge(c.date_of_birth) };
}

export function ChildProvider({ children }: { children: ReactNode }) {
  const [allChildren, setAllChildren] = useState<ChildWithAge[]>([]);
  const [child, setChild] = useState<ChildWithAge | null>(null);
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setChild(null);
      setAllChildren([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("children")
      .select("*")
      .eq("parent_id", user.id)
      .order("created_at");

    const list = (data || []).map(enrichWithAge);
    setAllChildren(list);

    setChild((prev) => {
      if (prev && list.some((c) => c.id === prev.id)) {
        return list.find((c) => c.id === prev.id) || prev;
      }
      return list.length > 0 ? list[0] : null;
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    // supabase fires INITIAL_SESSION on subscribe, covering the initial load
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadChildren();
    });

    return () => subscription.unsubscribe();
  }, [loadChildren]);

  const switchChild = useCallback(
    (id: string) => {
      const found = allChildren.find((c) => c.id === id);
      if (found) setChild(found);
    },
    [allChildren]
  );

  const refreshChild = useCallback(async () => {
    if (!child) return;
    const { data } = await supabase
      .from("children")
      .select("*")
      .eq("id", child.id)
      .single();
    if (data) {
      const enriched = enrichWithAge(data);
      setChild(enriched);
      setAllChildren((prev) =>
        prev.map((c) => (c.id === enriched.id ? enriched : c))
      );
    }
  }, [child]);

  return (
    <ChildContext.Provider
      value={{
        child,
        children: allChildren,
        loading,
        switchChild,
        refreshChild,
        refreshChildren: loadChildren,
      }}
    >
      {children}
    </ChildContext.Provider>
  );
}

export function useChild(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useChild must be used within ChildProvider");
  return ctx;
}
