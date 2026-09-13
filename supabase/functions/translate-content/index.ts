type TranslationEntry = { key: string; sr: string };
type Translation = { key: string; en: string; ru: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const outputText = (response: Record<string, unknown>) => {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      )
        return (part as { text: string }).text;
    }
  }
  return "";
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_TRANSLATION_MODEL");
  if (!supabaseUrl || !anonKey || !openAiKey || !model)
    return json({ error: "Translation service is not configured." }, 503);

  const adminResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!adminResponse.ok || !(await adminResponse.json()))
    return json({ error: "Administrator access is required." }, 403);

  const body = (await request.json().catch(() => null)) as {
    entries?: TranslationEntry[];
  } | null;
  const entries = (body?.entries ?? []).filter(
    (entry): entry is TranslationEntry =>
      typeof entry?.key === "string" &&
      typeof entry?.sr === "string" &&
      entry.key.length > 0 &&
      entry.sr.trim().length > 0,
  );
  if (!entries.length) return json({ translations: [] });
  if (entries.length > 40) return json({ error: "Too many texts." }, 400);

  const completion = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: `Translate each Serbian Cyrillic café-content value into natural English and Russian. Preserve brand names, prices, addresses, phone numbers, URLs, email addresses and line breaks. Return only the requested JSON.\n\n${JSON.stringify({ entries })}`,
      text: {
        format: {
          type: "json_schema",
          name: "cafe_translations",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              translations: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    key: { type: "string" },
                    en: { type: "string" },
                    ru: { type: "string" },
                  },
                  required: ["key", "en", "ru"],
                },
              },
            },
            required: ["translations"],
          },
        },
      },
      metadata: { source: "cafe-babuska-admin" },
      prompt_cache_key: "cafe-babuska-translations-v1",
    }),
  });
  if (!completion.ok) return json({ error: "Translation request failed." }, 502);

  try {
    const response = (await completion.json()) as Record<string, unknown>;
    const parsed = JSON.parse(outputText(response)) as {
      translations?: Translation[];
    };
    const translations = (parsed.translations ?? []).filter(
      (translation) =>
        entries.some((entry) => entry.key === translation.key) &&
        translation.en?.trim() &&
        translation.ru?.trim(),
    );
    if (translations.length !== entries.length) throw new Error("Incomplete");
    return json({ translations });
  } catch {
    return json({ error: "Translation response was invalid." }, 502);
  }
});
