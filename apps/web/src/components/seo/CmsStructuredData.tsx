import { normalizeStructuredData } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

interface CmsStructuredDataProps {
  data: unknown;
  idPrefix: string;
}

export function CmsStructuredData({ data, idPrefix }: CmsStructuredDataProps) {
  const entries = normalizeStructuredData(data);

  if (entries.length === 0) {
    return null;
  }

  return (
    <>
      {entries.map((entry, index) => (
        <JsonLd
          key={`${idPrefix}-${index + 1}`}
          id={`${idPrefix}-${index + 1}`}
          data={entry}
        />
      ))}
    </>
  );
}
