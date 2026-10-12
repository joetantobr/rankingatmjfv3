CREATE TABLE public.docs (
  collection text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.docs TO anon, authenticated;
GRANT ALL ON public.docs TO service_role;
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.docs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert" ON public.docs FOR INSERT TO anon, authenticated WITH CHECK (collection IN ('players','matches','settings','clubs'));
CREATE POLICY "public update" ON public.docs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (collection IN ('players','matches','settings','clubs'));
CREATE POLICY "public delete" ON public.docs FOR DELETE TO anon, authenticated USING (true);
ALTER TABLE public.docs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.docs;