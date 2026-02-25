export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const { GET: getLlmsTxt } = await import("@/app/llms.txt/route");
  return getLlmsTxt();
}
