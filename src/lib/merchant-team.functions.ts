import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteSchema = z.object({
  merchantId: z.string().uuid(),
  email: z.string().trim().email().max(255),
  role: z.enum(["MANAGER", "STAFF"]),
});

export type TeamMember = {
  id: string;
  user_id: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  display_name: string;
  created_at: string;
};

/** Liste l'équipe d'un commerce (membres + noms). */
export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ merchantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<TeamMember[]> => {
    const { supabase } = context;
    const { data: members, error } = await supabase
      .from("merchant_members")
      .select("id,user_id,role,created_at")
      .eq("merchant_id", data.merchantId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (members ?? []).map((m) => m.user_id);
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id,display_name")
        .in("id", ids);
      for (const p of profiles ?? []) names.set(p.id, p.display_name);
    }

    return (members ?? []).map((m) => ({
      ...m,
      role: m.role as TeamMember["role"],
      display_name: names.get(m.user_id) ?? "Membre",
    }));
  });

/** Ajoute un membre à l'équipe via son e-mail METZY (OWNER/MANAGER uniquement). */
export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("id,owner_id")
      .eq("id", data.merchantId)
      .maybeSingle();
    if (merchantError) throw new Error(merchantError.message);
    if (!merchant) throw new Error("Commerce introuvable.");

    if (merchant.owner_id !== userId) {
      const { data: allowed } = await supabase.rpc("is_merchant_member", {
        _merchant_id: data.merchantId,
        _min_owner: true,
      });
      if (allowed !== true) throw new Error("Droits insuffisants.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) throw new Error(listError.message);
    const target = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!target) {
      throw new Error("Aucun compte METZY avec cet e-mail. Demande-lui de créer son compte d'abord.");
    }
    if (target.id === merchant.owner_id) throw new Error("Le propriétaire fait déjà partie de l'équipe.");

    const { data: existing } = await supabaseAdmin
      .from("merchant_members")
      .select("id")
      .eq("merchant_id", data.merchantId)
      .eq("user_id", target.id)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from("merchant_members")
        .update({ role: data.role })
        .eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("merchant_members")
        .insert({ merchant_id: data.merchantId, user_id: target.id, role: data.role });
      if (insertError) throw new Error(insertError.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      action: "team.member_added",
      resource_type: "merchant",
      resource_id: data.merchantId,
      result: "ok",
      context: { role: data.role },
    });

    return { ok: true as const };
  });

/** Retire un membre (OWNER/MANAGER uniquement). */
export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ merchantId: z.string().uuid(), memberId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("merchant_members")
      .delete()
      .eq("id", data.memberId)
      .eq("merchant_id", data.merchantId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
