import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createRankingDb } from "@/lib/ranking-db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ranking ATMJF — Tênis de mesa" },
      { name: "description", content: "Ranking de tênis de mesa da ATMJF: registre partidas, acompanhe pontos e jogadores." },
      { property: "og:title", content: "Ranking ATMJF — Tênis de mesa" },
      { property: "og:description", content: "Registre partidas e acompanhe o ranking dos jogadores da ATMJF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (window as unknown as { __rankingDb: unknown }).__rankingDb = createRankingDb();
    setReady(true);
  }, []);
  if (!ready) return null;
  return (
    <iframe src="/ranking.html" title="Ranking ATMJF" className="fixed inset-0 h-full w-full border-0" />
  );
}
