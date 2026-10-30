import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if onboarding is already completed
  const { data: onboarding } = await supabase
    .from("onboarding")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (onboarding?.completed) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <OnboardingForm userId={user.id} />
    </div>
  );
}
