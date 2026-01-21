"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserRole } from "@/lib/types";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("patient");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
          data: {
            full_name: fullName,
            role: userRole,
          },
        },
      });
      if (signUpError) throw signUpError;

      // Profile will be automatically created by database trigger
      // The trigger reads role and full_name from raw_user_meta_data
      // It uses SECURITY DEFINER so it bypasses RLS and always works
      // No need for manual fallback - trigger handles it at database level

      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 font-display", className)} {...props}>
      <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold text-[#0c1b1d] dark:text-white">Create Account</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">Sign up to get started with medcAIr</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="fullName" className="text-[#0c1b1d] dark:text-white font-semibold">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-2 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20 text-[#0c1b1d] dark:text-white dark:bg-gray-900"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-[#0c1b1d] dark:text-white font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-2 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20 text-[#0c1b1d] dark:text-white dark:bg-gray-900"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="userRole" className="text-[#0c1b1d] dark:text-white font-semibold">I am a</Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="userRole"
                      value="patient"
                      checked={userRole === "patient"}
                      onChange={(e) => setUserRole(e.target.value as UserRole)}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-[#0c1b1d] dark:text-white font-medium">Patient</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="userRole"
                      value="hospital"
                      checked={userRole === "hospital"}
                      onChange={(e) => setUserRole(e.target.value as UserRole)}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-[#0c1b1d] dark:text-white font-medium">Hospital</span>
                  </label>
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password" className="text-[#0c1b1d] dark:text-white font-semibold">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-2 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20 text-[#0c1b1d] dark:text-white dark:bg-gray-900"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password" className="text-[#0c1b1d] dark:text-white font-semibold">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="border-2 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/20 text-[#0c1b1d] dark:text-white dark:bg-gray-900"
                />
              </div>
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-primary text-white hover:bg-primary/90 font-semibold py-6 text-lg shadow-lg shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
              <Link href="/auth/login" className="text-primary hover:text-primary/80 font-semibold underline-offset-4 hover:underline">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
