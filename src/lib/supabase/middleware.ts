import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Since we're using custom localStorage-based auth (not Supabase Auth),
  // we just pass through all requests. Auth is handled client-side in dashboard layout.
  return NextResponse.next({ request });
}
