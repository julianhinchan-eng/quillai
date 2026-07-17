export default async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const apiKey = Netlify.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const messages = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);

      return Response.json(
        { error: "AI request failed", details: data },
        { status: response.status }
      );
    }

    return Response.json({
      message: data.choices?.[0]?.message?.content ?? "",
    });
  } catch (error) {
    console.error("Chat function error:", error);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
