DELETE FROM public.ai_conversations c
WHERE NOT EXISTS (SELECT 1 FROM public.ai_messages m WHERE m.conversation_id = c.id);