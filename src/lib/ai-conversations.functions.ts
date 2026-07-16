import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoredMsg = {
  role: "user" | "assistant";
  content: string;
  kind?: "text" | "image" | "image-request" | "video" | "video-request";
  imageUrl?: string;
  imagePreview?: string;
  fileName?: string;
  videoUrl?: string;
  // Original prompt used to generate the video — kept so we can produce a
  // continuation clip when the user extends it.
  prompt?: string;
  // True when this video message is the 8-second extension of the previous
  // video. Used to enforce the one-time extension rule.
  isExtension?: boolean;
};

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title?: string }) => ({ title: (d?.title ?? "").slice(0, 80) || "New chat" }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: userId, title: data.title })
      .select("id, title, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id || typeof d.id !== "string") throw new Error("id required");
    return { id: d.id };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; title: string }) => {
    if (!d?.id) throw new Error("id required");
    return { id: d.id, title: (d.title ?? "").slice(0, 80) || "New chat" };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("ai_conversations")
      .update({ title: data.title })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getConversationMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) => {
    if (!d?.conversationId) throw new Error("conversationId required");
    return { conversationId: d.conversationId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      ...(r.content as object),
    })) as Array<StoredMsg & { id: string }>;
  });

export const appendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; message: StoredMsg }) => {
    if (!d?.conversationId) throw new Error("conversationId required");
    if (!d?.message || (d.message.role !== "user" && d.message.role !== "assistant"))
      throw new Error("bad message");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { role, ...rest } = data.message;
    const { error } = await supabase.from("ai_messages").insert({
      conversation_id: data.conversationId,
      user_id: userId,
      role,
      content: rest,
    });
    if (error) throw new Error(error.message);
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversationId)
      .eq("user_id", userId);
    return { ok: true };
  });

export const generateConversationTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; firstMessage: string }) => {
    if (!d?.conversationId) throw new Error("conversationId required");
    return { conversationId: d.conversationId, firstMessage: (d.firstMessage ?? "").slice(0, 1000) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    let title = data.firstMessage.replace(/\s+/g, " ").trim().slice(0, 40) || "New chat";
    if (key) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "You generate a very short chat title (3-4 words max) summarizing the user's message. Reply ONLY with the title in the same language as the user. No quotes, no punctuation at the end.",
              },
              { role: "user", content: data.firstMessage },
            ],
          }),
        });
        if (res.ok) {
          const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const generated = j.choices?.[0]?.message?.content?.trim().replace(/^["'`]+|["'`.!?]+$/g, "");
          if (generated) title = generated.slice(0, 60);
        }
      } catch (e) {
        console.error("[QuillAI] title gen error", e);
      }
    }
    await supabase
      .from("ai_conversations")
      .update({ title })
      .eq("id", data.conversationId)
      .eq("user_id", userId);
    return { title };
  });