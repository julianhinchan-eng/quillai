CREATE TABLE public.thumbs_up (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.thumbs_up TO authenticated;
GRANT ALL ON public.thumbs_up TO service_role;
ALTER TABLE public.thumbs_up ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view thumbs" ON public.thumbs_up FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users add own thumbs" ON public.thumbs_up FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own thumbs" ON public.thumbs_up FOR DELETE TO authenticated USING (auth.uid() = user_id);