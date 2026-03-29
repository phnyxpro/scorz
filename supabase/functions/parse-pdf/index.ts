import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import mammoth from "npm:mammoth@1.8.0";

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

    // Extract file path from the public URL to download from storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the storage path from the public URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (!pathMatch) {
      return new Response(JSON.stringify({ error: "Invalid storage URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bucket = pathMatch[1];
    const filePath = decodeURIComponent(pathMatch[2]);
    const fileExt = filePath.split(".").pop()?.toLowerCase() || "";

    // Download file bytes
    const { data: fileData, error: dlError } = await supabase.storage.from(bucket).download(filePath);
    if (dlError || !fileData) {
      console.error("Download error:", dlError);
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- TXT files: wrap in paragraphs, no AI needed ---
    if (fileExt === "txt") {
      const text = await fileData.text();
      const html = text
        .split(/\n\n+/)
        .map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
        .join("");

      if (type === "rubric") {
        return new Response(JSON.stringify({ type, raw_text: html, criteria: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ type, content: html }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- DOCX files: use mammoth for high-fidelity conversion ---
    if (fileExt === "docx" || fileExt === "doc") {
      const arrayBuffer = await fileData.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      if (type === "rules") {
        return new Response(JSON.stringify({ type, content: html }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // For rubric: return HTML and also extract criteria via AI
      const criteriaResult = await extractRubricCriteria(html, LOVABLE_API_KEY);
      return new Response(JSON.stringify({ type, raw_text: html, criteria: criteriaResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- PDF files: send bytes to Gemini multimodal ---
    if (fileExt === "pdf") {
      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // Convert to base64
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);

      if (type === "rules") {
        return await handlePdfRules(base64, LOVABLE_API_KEY);
      } else {
        return await handlePdfRubric(base64, LOVABLE_API_KEY);
      }
    }

    return new Response(JSON.stringify({ error: `Unsupported file type: .${fileExt}` }), {
      status: 400,
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

async function callGemini(messages: any[], tools: any[] | undefined, toolChoice: any | undefined, apiKey: string) {
  const body: any = {
    model: "google/gemini-2.5-flash",
    messages,
  };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error("Rate limit exceeded. Please try again later.");
    if (status === 402) throw new Error("AI credits exhausted. Please add credits.");
    const text = await response.text();
    console.error("AI gateway error:", status, text);
    throw new Error("Failed to parse document");
  }

  return response.json();
}

async function handlePdfRules(base64: string, apiKey: string) {
  const systemPrompt = `You are a document-to-HTML converter. Convert this PDF into clean, semantic HTML that faithfully reproduces the original document's appearance. Preserve:
- Headings (h1-h6), bold, italic, underline
- Colors and highlights using inline styles
- Tables with borders and cell styling
- Numbered and bulleted lists
- Text alignment (center, right, justify)
- Font sizes using relative em units
- Any images described as [image] placeholders
Return ONLY the HTML body content, no <html>/<head> wrapper.`;

  const data = await callGemini(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "Convert this PDF document to faithful HTML:" },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
        ],
      },
    ],
    [
      {
        type: "function",
        function: {
          name: "return_html",
          description: "Return the converted HTML content",
          parameters: {
            type: "object",
            properties: { content: { type: "string" } },
            required: ["content"],
            additionalProperties: false,
          },
        },
      },
    ],
    { type: "function", function: { name: "return_html" } },
    apiKey,
  );

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No structured response from AI");
  const parsed = JSON.parse(toolCall.function.arguments);

  return new Response(JSON.stringify({ type: "rules", content: parsed.content }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePdfRubric(base64: string, apiKey: string) {
  const systemPrompt = `You are a document parser. Extract the content from this PDF.
1. Convert the full document into clean, semantic HTML preserving all formatting (headings, bold, italic, tables, lists, colors, alignment).
2. Also extract any scoring rubric criteria you can identify.

Return both the HTML content and criteria.`;

  const data = await callGemini(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract content and rubric criteria from this PDF:" },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
        ],
      },
    ],
    [
      {
        type: "function",
        function: {
          name: "return_rubric",
          description: "Return the extracted HTML content and rubric criteria",
          parameters: {
            type: "object",
            properties: {
              html_content: { type: "string", description: "Full document as styled HTML" },
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
            },
            required: ["html_content", "criteria"],
            additionalProperties: false,
          },
        },
      },
    ],
    { type: "function", function: { name: "return_rubric" } },
    apiKey,
  );

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No structured response from AI");
  const parsed = JSON.parse(toolCall.function.arguments);

  return new Response(
    JSON.stringify({ type: "rubric", raw_text: parsed.html_content, criteria: parsed.criteria || [] }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function extractRubricCriteria(html: string, apiKey: string): Promise<any[]> {
  try {
    const data = await callGemini(
      [
        {
          role: "system",
          content: `Extract scoring rubric criteria from this HTML content. If no criteria found, return an empty array.`,
        },
        { role: "user", content: html },
      ],
      [
        {
          type: "function",
          function: {
            name: "return_criteria",
            description: "Return extracted criteria",
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
              },
              required: ["criteria"],
              additionalProperties: false,
            },
          },
        },
      ],
      { type: "function", function: { name: "return_criteria" } },
      apiKey,
    );

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return [];
    const parsed = JSON.parse(toolCall.function.arguments);
    return parsed.criteria || [];
  } catch (e) {
    console.error("Criteria extraction failed:", e);
    return [];
  }
}
