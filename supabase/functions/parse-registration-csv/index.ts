import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { csvText, formFields, hierarchy } = await req.json();
    if (!csvText || !formFields) {
      return new Response(JSON.stringify({ error: "Missing csvText or formFields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the system prompt describing the schema
    const fieldDescriptions = formFields.map((f: any) => {
      let desc = `- "${f.key}" (${f.type}): label="${f.label}"`;
      if (f.required) desc += " [REQUIRED]";
      if (f.options?.length) {
        desc += ` options=[${f.options.map((o: any) => `"${o.label || o.value || o}"`).join(", ")}]`;
      }
      return desc;
    }).join("\n");

    const hierarchyDesc = hierarchy ? [
      hierarchy.levels?.length ? `Levels: ${hierarchy.levels.map((l: any) => `"${l.name}" (id:${l.id})`).join(", ")}` : "",
      hierarchy.subEvents?.length ? `Sub-events: ${hierarchy.subEvents.map((s: any) => `"${s.name}" (id:${s.id}, level_id:${s.level_id})`).join(", ")}` : "",
      hierarchy.categories?.length ? `Categories: ${hierarchy.categories.map((c: any) => `"${c.name}" (id:${c.id}, level_id:${c.level_id})`).join(", ")}` : "",
    ].filter(Boolean).join("\n") : "";

    const systemPrompt = `You are a data extraction assistant for a competition registration system.

Given a CSV file, extract registration data and map it to the schema fields below.

FORM FIELDS:
${fieldDescriptions}

${hierarchyDesc ? `COMPETITION HIERARCHY:\n${hierarchyDesc}` : ""}

IMPORTANT RULES:
1. Map CSV columns to the correct form fields using fuzzy matching (e.g. "Name of Applicant" → "full_name", "Applicant's Email" → "email").
2. For dropdown/select fields, match CSV values to the closest option label or value. If the field has options, use the exact option value/label that best matches.
3. For cells with multiple lines (newline-separated names/items), join them with ", " (comma-space).
4. For level/sub-event/category fields, resolve to the matching ID from the hierarchy.
5. If a value cannot be confidently mapped, include it as-is and add a warning.
6. Every row must have at least full_name and email.
7. Mark rows with issues in the "warnings" array.
8. The "confidence" field should be "high", "medium", or "low".`;

    const userPrompt = `Parse the following CSV data and extract registration records.\n\nCSV DATA:\n${csvText}`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "return_parsed_registrations",
              description: "Return the parsed registration records from the CSV",
              parameters: {
                type: "object",
                properties: {
                  registrations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        full_name: { type: "string", description: "Contestant full name" },
                        email: { type: "string", description: "Email address" },
                        phone: { type: "string", description: "Phone number" },
                        location: { type: "string", description: "Location/city" },
                        age_category: { type: "string", description: "adult or minor" },
                        guardian_name: { type: "string", description: "Guardian name if minor" },
                        guardian_email: { type: "string", description: "Guardian email" },
                        guardian_phone: { type: "string", description: "Guardian phone" },
                        bio: { type: "string", description: "Bio text" },
                        level_id: { type: "string", description: "Resolved level ID" },
                        level_name: { type: "string", description: "Level name from CSV" },
                        sub_event_id: { type: "string", description: "Resolved sub-event ID" },
                        sub_event_name: { type: "string", description: "Sub-event name from CSV" },
                        category_id: { type: "string", description: "Resolved category ID" },
                        category_name: { type: "string", description: "Category name from CSV" },
                        custom_fields: {
                          type: "object",
                          description: "Key-value pairs for custom form fields (use the field key as the object key)",
                          additionalProperties: { type: "string" },
                        },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        warnings: {
                          type: "array",
                          items: { type: "string" },
                          description: "Any issues or uncertainties with this row",
                        },
                      },
                      required: ["full_name", "email", "confidence", "warnings"],
                    },
                  },
                },
                required: ["registrations"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_parsed_registrations" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI parsing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-registration-csv error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
