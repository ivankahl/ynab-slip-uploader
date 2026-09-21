export const parseJsonResponse = (text: string): unknown => {
  const trimmed = text.trim();
  let withoutFence = trimmed;
  if (withoutFence.startsWith("```")) {
    const firstLineBreak = withoutFence.indexOf("\n");
    withoutFence =
      firstLineBreak >= 0 ? withoutFence.slice(firstLineBreak + 1) : "";
  }
  if (withoutFence.endsWith("```")) {
    withoutFence = withoutFence.slice(0, -3);
  }
  withoutFence = withoutFence.trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1));
    }

    throw new Error("The model response did not contain a JSON object");
  }
};

export const withJsonInstructions = (
  prompt: string,
  schema: Record<string, unknown>
): string =>
  `${prompt}\n\nReturn only a JSON object matching this JSON Schema exactly:\n${JSON.stringify(
    schema
  )}`;
