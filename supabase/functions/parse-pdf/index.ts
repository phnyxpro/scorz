import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, type } = await req.json() as { url: string; type: "rules" | "rubric" };
    if (!url || !type) {
      return new Response(JSON.stringify({ error: "url and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt =
      type === "rubric"
        ? `You are a document parser. Extract scoring rubric criteria from the provided document URL.
Return a JSON object with this structure:
{
  "criteria": [
    {
      "name": "Criterion Name",
      "description_1": "Description for score 1 (lowest)",
      "description_2": "Description for score 2",
      "description_3": "Description for score 3",
      "description_4": "Description for score 4",
      "description_5": "Description for score 5 (highest)"
    }
  ],
  "raw_text": "The full text content of the document"
}
If you cannot identify 5 distinct scoring levels, distribute the descriptions as best you can across the 5 levels.
Always include the raw_text field with the complete extracted text.`
        : `You are a document parser. Extract and return the full text content from the provided document URL.
Return a JSON object with this structure:
{
  "content": "The full text content of the document, preserving paragraphs and structure with newlines"
}
Preserve headings, numbered lists, bullet points, and paragraph breaks using plain text formatting.`;

    const userPrompt = `Please extract the content from this document: ${url}`;

    const tools = type === "rubric"
      ? [
          {
            type: "function" as const,
            function: {
              name: "return_rubric",
              description: "Return the extracted rubric criteria and raw text",
              parameters: {
                type: "object",
                properties: {
                  criteria: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description_1: { type: "string" },
                        description_2: { type: "string" },
                        description_3: { type: "string" },
                        description_4: { type: "string" },
                        description_5: { type: "string" },
                      },
                      required: ["name", "description_1", "description_2", "description_3", "description_4", "description_5"],
                      additionalProperties: false,
                    },
                  },
                  raw_text: { type: "string" },
                },
                required: ["criteria", "raw_text"],
                additionalProperties: false,
              },
            },
          },
        ]
      : [
          {
            type: "function" as const,
            function: {
              name: "return_rules",
              description: "Return the extracted rules text content",
              parameters: {
                type: "object",
                properties: {
                  content: { type: "string" },
                },
                required: ["content"],
                additionalProperties: false,
              },
            },
          },
        ];

    const toolChoice = type === "rubric"
      ? { type: "function" as const, function: { name: "return_rubric" } }
      : { type: "function" as const, function: { name: "return_rules" } };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: toolChoice,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(JSON.stringify({ error: "Failed to parse document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ type, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
