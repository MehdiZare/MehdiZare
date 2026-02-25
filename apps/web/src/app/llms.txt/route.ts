import { buildLlmsTxtContent } from "@/lib/llms";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  try {
    return new Response(buildLlmsTxtContent(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
