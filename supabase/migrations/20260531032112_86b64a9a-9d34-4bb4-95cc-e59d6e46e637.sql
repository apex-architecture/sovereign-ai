
ALTER PUBLICATION supabase_realtime ADD TABLE public.influencers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER TABLE public.influencers REPLICA IDENTITY FULL;
