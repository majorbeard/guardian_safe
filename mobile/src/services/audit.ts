import { supabase } from "./supabase";
import { currentUser, currentSafe } from "../store/auth";

class AuditService {
  async log(
    event: string,
    details: string,
    success: boolean = true,
    tripId?: string
  ) {
    try {
      await supabase.from("activity_log").insert({
        event,
        user_type: "driver",
        user_id: currentUser.value?.username || "unknown",
        safe_id: currentSafe.value?.id,
        trip_id: tripId,
        details,
        success,
        created_at: new Date().toISOString(),
      });

      console.log(`Logged: ${event} - ${details}`);
    } catch (err) {
      console.error("Audit log failed:", err);
      // Don't block on logging failures
    }
  }
}

export const auditService = new AuditService();
