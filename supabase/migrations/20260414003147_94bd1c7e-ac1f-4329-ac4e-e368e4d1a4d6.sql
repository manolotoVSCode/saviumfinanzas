CREATE TABLE public.classification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains', 'starts_with')),
  category_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rules"
ON public.classification_rules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rules"
ON public.classification_rules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
ON public.classification_rules FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
ON public.classification_rules FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_classification_rules_user_id ON public.classification_rules(user_id);
CREATE INDEX idx_classification_rules_keyword ON public.classification_rules(keyword);