export default async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const apiKey = Netlify.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY is not configured" },
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

    const contents = messages
      .filter(
        (message: any) =>
          message &&
          typeof message.content === "string" &&
          message.content.trim()
      )
      .map((message: any) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return Response.json(
        {
          error: "Gemini request failed",
          details: data,
        },
        { status: response.status }
      );
    }

    const message =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part.text ?? "")
        .join("") ?? "";

    return Response.json({ message });
  } catch (error) {
    console.error("Chat function error:", error);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
