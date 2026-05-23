import { supabase } from "@/lib/supabase";

export async function enrichEvents(events: any[]) {
  // =========================
  // ADD HYPE COUNTS
  // =========================
  const eventsWithHype = await Promise.all(
    events.map(async (event) => {
      // =========================
      // GET HYPE COUNT
      // =========================
      const { count } = await supabase
        .from("event_hype")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("event_id", event.id);

      // =========================
      // GET CREATOR USERNAME
      // =========================
      let creatorUsername = "";

      if (event.created_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", event.created_by)
          .single();

        creatorUsername = profile?.username || "unknown";
      }

      return {
        ...event,

        hype_count: count || 0,

        creator_username: creatorUsername,
      };
    }),
  );

  return eventsWithHype;
}
