import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function sanitizeRedirectPath(path: string | null): string {
  const fallback = "/dashboard";
  if (!path) return fallback;
  // Only allow relative paths starting with / and not containing // or protocol
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  return path;
}

function createSupabaseClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next"));

  const cookieStore = await cookies();

  if (code) {
    const supabase = createSupabaseClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Also handle token_hash (email confirmation via link)
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && type) {
    const validTypes = ["signup", "email"] as const;
    const typedType = validTypes.includes(type as typeof validTypes[number])
      ? (type as "signup" | "email")
      : null;

    if (typedType) {
      const supabase = createSupabaseClient(cookieStore);
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: typedType,
      });

      if (!error) {
        return NextResponse.redirect(`${origin}/login?confirmed=1`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
