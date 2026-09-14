export const INDEXNOW_KEY = "mehdi-personal-8dbda239fd79f92cc2c824c92eae2f22";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  return new Response(INDEXNOW_KEY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
