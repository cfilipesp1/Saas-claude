"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export async function getProfile() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return profile;
}

export async function getClinic() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get the user's profile to find their clinic_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.clinic_id) return null;

  const { data } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", profile.clinic_id)
    .single();
  return data;
}
