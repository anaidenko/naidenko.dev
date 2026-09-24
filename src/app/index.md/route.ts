import { pageMarkdown } from "@/lib/markdown";

export const dynamic = "force-static";

export function GET() {
    return new Response(pageMarkdown(), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
