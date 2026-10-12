import { supabase } from "@/integrations/supabase/client";

type Doc = Record<string, unknown>;
type Snap = { docs: { id: string; data: () => Doc }[] };
type Listener = (s: Snap) => void;

// Firestore-like adapter used by the ranking page (public/ranking.html).
export function createRankingDb() {
  const cache: Record<string, Map<string, Doc>> = {};
  const listeners: Record<string, Set<Listener>> = {};
  let channelStarted = false;

  const emit = (col: string) => {
    const m = cache[col] ?? new Map();
    const snap: Snap = { docs: [...m.entries()].map(([id, d]) => ({ id, data: () => d })) };
    listeners[col]?.forEach((fn) => fn(snap));
  };

  const refetch = async (col: string) => {
    const { data, error } = await supabase.from("docs").select("id,data").eq("collection", col);
    if (error) return;
    cache[col] = new Map((data ?? []).map((r) => [r.id, r.data as Doc]));
    emit(col);
  };

  const startChannel = () => {
    if (channelStarted) return;
    channelStarted = true;
    // Backup refresh in case a live update is missed.
    setInterval(() => Object.keys(listeners).forEach(refetch), 8000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") Object.keys(listeners).forEach(refetch);
    });
    supabase
      .channel("ranking-docs")
      .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, (p) => {
        const row = (p.eventType === "DELETE" ? p.old : p.new) as {
          collection: string;
          id: string;
          data: Doc;
        };
        if (!row?.collection) return;
        const m = (cache[row.collection] ??= new Map());
        if (p.eventType === "DELETE") m.delete(row.id);
        else m.set(row.id, row.data);
        emit(row.collection);
      })
      .subscribe();
  };

  return {
    collection(col: string) {
      return {
        doc(id: string) {
          return {
            async set(data: Doc) {
              (cache[col] ??= new Map()).set(id, data);
              const { error } = await supabase
                .from("docs")
                .upsert({ collection: col, id, data: data as never, updated_at: new Date().toISOString() });
              if (error) throw error;
            },
            async delete() {
              cache[col]?.delete(id);
              const { error } = await supabase.from("docs").delete().eq("collection", col).eq("id", id);
              if (error) throw error;
            },
          };
        },
        onSnapshot(fn: Listener, onErr?: (e: unknown) => void) {
          (listeners[col] ??= new Set()).add(fn);
          startChannel();
          supabase
            .from("docs")
            .select("id,data")
            .eq("collection", col)
            .then(({ data, error }) => {
              if (error) return onErr?.(error);
              cache[col] = new Map((data ?? []).map((r) => [r.id, r.data as Doc]));
              emit(col);
            });
          return () => listeners[col]?.delete(fn);
        },
      };
    },
  };
}
