import { supabase } from "@/integrations/supabase/client";

export interface StudentProfileMinimal {
  id: string;
  first_name: string | null;
  last_name?: string | null;
  hindi_name?: string | null;
  student_class: string | null;
  admission_number: string | null;
  email?: string | null;
  notification_email?: string | null;
  notification_email_confirmed_at?: string | null;
  points?: number | null;
  role?: string | null;
  is_approved?: boolean | null;
}

/**
 * Fetch ALL approved student profiles without the 1000-record PostgREST default limit.
 * Uses range pagination to retrieve 100% of student profiles in chunks.
 */
export async function fetchAllApprovedStudents(
  columns = "id, first_name, last_name, hindi_name, student_class, admission_number, points, email, notification_email"
): Promise<StudentProfileMinimal[]> {
  let allProfiles: StudentProfileMinimal[] = [];
  let fromIndex = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("profiles")
      .select(columns)
      .eq("role", "student")
      .eq("is_approved", true)
      .order("student_class", { ascending: true })
      .order("first_name", { ascending: true })
      .range(fromIndex, fromIndex + pageSize - 1);

    if (error) {
      console.error("Error fetching paginated profiles:", error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allProfiles = [...allProfiles, ...data as any[]];
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        fromIndex += pageSize;
      }
    }
  }

  return allProfiles;
}

/**
 * Fetch ALL approved user profiles (students + admins + librarians) for general messaging.
 */
export async function fetchAllApprovedProfiles(
  columns = "id, first_name, last_name, hindi_name, student_class, admission_number, email, notification_email, notification_email_confirmed_at, role"
): Promise<StudentProfileMinimal[]> {
  let allProfiles: StudentProfileMinimal[] = [];
  let fromIndex = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("profiles")
      .select(columns)
      .eq("is_approved", true)
      .order("first_name", { ascending: true })
      .range(fromIndex, fromIndex + pageSize - 1);

    if (error) {
      console.error("Error fetching paginated profiles:", error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allProfiles = [...allProfiles, ...data as any[]];
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        fromIndex += pageSize;
      }
    }
  }

  return allProfiles;
}
