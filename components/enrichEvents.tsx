import { supabase } from "@/lib/supabase";

// Adds extra data to event objects
export async function enrichEvents(events: any[]) {
  // Add hype count and creator username
  const eventsWithHype = await Promise.all(
    events.map(async (event) => {
      // Fetch total hype count for event
      const { count } = await supabase
        .from("event_hype")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("event_id", event.id);

      // Default creator username
      let creatorUsername = "";

      // Fetch creator profile if creator exists
      if (event.created_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", event.created_by)
          .single();

        creatorUsername = profile?.username || "unknown";
      }

      // Return updated event object
      return {
        ...event,

        hype_count: count || 0,

        creator_username: creatorUsername,
      };
    }),
  );

  // Return enriched events
  return eventsWithHype;
}
