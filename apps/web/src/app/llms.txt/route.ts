export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const { buildLlmsTxtContent } = await import("@/lib/llms");

  return new Response(buildLlmsTxtContent(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
