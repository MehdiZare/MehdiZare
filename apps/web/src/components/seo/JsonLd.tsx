interface JsonLdProps {
  data: Record<string, unknown>;
  id?: string;
}

function serializeJsonLd(data: Record<string, unknown>): string | null {
  try {
    return JSON.stringify(data).replace(/</g, "\\u003c");
  } catch {
    return null;
  }
}

export function JsonLd({ data, id }: JsonLdProps) {
  const serialized = serializeJsonLd(data);
  if (!serialized) {
    return null;
  }

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  );
}
