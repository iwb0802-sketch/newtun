
-- piano_profiles: 세션과 별개로, 같은 물리적 피아노의 인하모니시티(B) 학습 데이터를
-- 여러 조율 세션에 걸쳐 영구적으로 누적하기 위한 프로필 테이블
CREATE TABLE public.piano_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  scale jsonb NOT NULL DEFAULT '{}'::jsonb, -- { [keyIndex]: { B, confidence, nPartialsUsed, measuredAt } }
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.piano_profiles TO authenticated;
GRANT ALL ON public.piano_profiles TO service_role;
ALTER TABLE public.piano_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own piano profiles" ON public.piano_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_piano_profiles_updated_at
BEFORE UPDATE ON public.piano_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_piano_profiles_user ON public.piano_profiles(user_id, updated_at DESC);
