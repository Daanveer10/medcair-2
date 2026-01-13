import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

    if (token_hash && type) {
      const supabase = await createClient();

      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });
      if (!error) {
        // After email confirmation, ensure profile exists
        // Trigger should have created it, but verify and create if needed
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
          
          // If profile doesn't exist (trigger failed), create it from metadata
          if (!profile && user.user_metadata) {
            await supabase
              .from("user_profiles")
              .insert({
                user_id: user.id,
                role: user.user_metadata.role || 'patient',
                full_name: user.user_metadata.full_name || 'User',
              });
          }
        }
        
        // redirect user to specified redirect URL or root of app
        redirect(next);
      } else {
        // redirect the user to an error page with some instructions
        redirect(`/auth/error?error=${error?.message}`);
      }
    }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`);
}
