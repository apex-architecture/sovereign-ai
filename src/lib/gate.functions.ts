import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Do not import supabaseAdmin at module scope — it must stay server-only.
// Route/component graphs can transitively include this file.

// Reports whether the sovereign operator has already claimed the empire.
export const ownerExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(error.message);
  return { exists: (data?.users?.length ?? 0) > 0 };
});

// Wipes the sovereign operator so a fresh PIN can be sealed. Single-operator
// app: there is no other identity to protect. Idempotent.
export const resetOwner = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ confirm: z.literal("WIPE") }).parse(v))
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) throw new Error(error.message);
    for (const u of data?.users ?? []) {
      await supabaseAdmin.auth.admin.deleteUser(u.id);
    }
    return { wiped: data?.users?.length ?? 0 };
  });
