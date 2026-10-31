"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Check } from "lucide-react";

const currencies = ["NGN", "GHS", "KES", "ZAR", "UGX", "TZS", "USD"];
const countries = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Uganda", "Tanzania",
  "Ethiopia", "Egypt", "Morocco", "Senegal", "Rwanda", "Zambia",
];

export function OnboardingForm({ userId }: { userId: string }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: "",
    country: "Nigeria",
    currency: "NGN",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    // Create business settings
    const { error: settingsError } = await supabase
      .from("business_settings")
      .insert({
        user_id: userId,
        business_name: formData.businessName,
        country: formData.country,
        currency: formData.currency,
        phone: formData.phone || null,
        timezone: "Africa/Lagos",
      });

    if (settingsError) {
      setError(settingsError.message);
      setLoading(false);
      return;
    }

    // Mark onboarding as completed
    const { error: onboardingError } = await supabase
      .from("onboarding")
      .insert({
        user_id: userId,
        completed: true,
        step: 3,
        business_name: formData.businessName,
        country: formData.country,
        currency: formData.currency,
      });

    if (onboardingError) {
      setError(onboardingError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <Card className="w-full max-w-xl shadow-lg border-primary/10">
      <CardHeader className="space-y-2 text-center pb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="text-2xl font-bold">H</span>
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight">Set up your business</CardTitle>
        <CardDescription className="text-base">
          Just a few details to get you started
        </CardDescription>
        <div className="flex items-center justify-center gap-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 w-8 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="Acme Trading Co."
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(v) => setFormData({ ...formData, country: v })}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-11"
              onClick={() => setStep(2)}
              disabled={!formData.businessName}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Base Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(v) => setFormData({ ...formData, currency: v })}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Business Phone (optional)</Label>
              <Input
                id="phone"
                placeholder="+234 800 000 0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="w-1/2 h-11" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="w-1/2 h-11" onClick={() => setStep(3)}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ready to go!</h3>
              <p className="text-sm text-muted-foreground">
                Your business <strong>{formData.businessName}</strong> is set up with{" "}
                <strong>{formData.currency}</strong> as your base currency.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="w-1/2 h-11" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button className="w-1/2 h-11" onClick={handleSubmit} disabled={loading}>
                {loading ? "Setting up..." : "Go to Dashboard"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
