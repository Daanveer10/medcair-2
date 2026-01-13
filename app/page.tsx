import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { Stethoscope, Calendar, Clock, Users, Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 w-full flex flex-col">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-white">
          <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-6 w-6 text-blue-600" />
                <Link href={"/"} className="text-xl font-bold text-gray-900">MedCair AI</Link>
              </div>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <div className="flex items-center gap-4">
                  <Link href="/auth/login">
                    <Button variant="ghost">Login</Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button>Sign Up</Button>
                  </Link>
                  <ThemeSwitcher />
                </div>
              </Suspense>
            )}
          </div>
        </nav>

        <div className="flex-1 flex flex-col items-center">
          <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                AI-Powered Hospital
                <br />
                <span className="text-blue-600">Receptionist</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Streamline your healthcare experience with intelligent appointment scheduling,
                clinic search, and automated follow-up management.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="text-lg px-8 py-6">
                    Get Started
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                  <Search className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Smart Clinic Search</h3>
                <p className="text-gray-600">
                  Find clinics by disease, availability, location, and distance. Get instant results
                  tailored to your needs.
                </p>
              </div>

              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Easy Scheduling</h3>
                <p className="text-gray-600">
                  View real-time availability, see booked and free slots, and book appointments
                  instantly with just a few clicks.
                </p>
              </div>

              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Follow-up Management</h3>
                <p className="text-gray-600">
                  Automated follow-up scheduling and reminders ensure you never miss important
                  healthcare appointments.
                </p>
              </div>
            </div>

            <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">For Patients</h2>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    </div>
                    <span>Search clinics by disease, specialty, or location</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    </div>
                    <span>View real-time slot availability</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    </div>
                    <span>Book appointments instantly</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    </div>
                    <span>Manage your appointments and follow-ups</span>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4">For Hospitals</h2>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                    </div>
                    <span>Manage multiple clinics and departments</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                    </div>
                    <span>Create and manage appointment slots</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                    </div>
                    <span>View all appointments in one dashboard</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                    </div>
                    <span>Schedule follow-ups for patients</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16 bg-gray-50">
          <p className="text-gray-600">
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline text-blue-600"
              rel="noreferrer"
            >
              Supabase
            </a>
            {" "}and Next.js
          </p>
        </footer>
      </div>
    </main>
  );
}
