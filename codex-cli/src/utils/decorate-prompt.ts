export async function decoratePrompt(text: string): Promise<string> {
  const url = process.env.PROMPT_DECORATOR_URL;
  if (!url) {
    return text;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });

    if (!res.ok) {
      return text;
    }

    const data = (await res.json()) as { prompt?: string; decorated?: string };
    const decorated = data.prompt ?? data.decorated;
    return typeof decorated === "string" ? decorated : text;
  } catch {
    return text;
  }
}
