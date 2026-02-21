"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Profile, Clinic } from "@/lib/types";

export async function getProfile(): Promise<Profile | null> {
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

export async function getClinic(): Promise<Clinic | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

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

/**
 * Optimized: fetches profile + clinic in a single auth call + 1 joined query.
 * Replaces separate getProfile() + getClinic() calls in the layout.
 */
export async function getProfileWithClinic(): Promise<{
  profile: Profile;
  clinic: Clinic | null;
} | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, clinic:clinics(*)")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  const { clinic, ...profileData } = profile as Profile & { clinic: Clinic | null };

  return {
    profile: profileData,
    clinic: clinic ?? null,
  };
}
