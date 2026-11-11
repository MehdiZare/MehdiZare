export const revalidate = 300;

export async function GET(): Promise<Response> {
  const { GET: getLlmsTxt } = await import("@/app/llms.txt/route");
  return getLlmsTxt();
}
