import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { Stethoscope, Calendar, Clock, Users, Search, Shield, Heart, Zap, Star, CheckCircle2, ArrowRight, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-white via-cyan-50/30 to-purple-50/30">
      <div className="flex-1 w-full flex flex-col">
        {/* Enhanced Navbar */}
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
          <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-cyan-600" />
                </div>
                <Link href={"/"} className="text-xl font-bold gradient-text-vibrant">
                  medcAIr
                </Link>
              </div>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <div className="flex items-center gap-4">
                  <Link href="/auth/login">
                    <Button variant="ghost" className="hidden sm:inline-flex">Login</Button>
                  </Link>
                  <Link href="/auth/sign-up">
                  <Button className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:opacity-90">
                    Get Started
                  </Button>
                  </Link>
                  <ThemeSwitcher />
                </div>
              </Suspense>
            )}
          </div>
        </nav>

        <div className="flex-1 flex flex-col items-center">
          {/* Hero Section */}
          <section className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-16 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-100 to-purple-100 rounded-full text-cyan-700 text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                <span>AI-Powered Healthcare Management</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Your Smart Healthcare
                <br />
                <span className="gradient-text-vibrant">
                  Receptionist
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Experience seamless appointment scheduling, intelligent clinic discovery, and automated healthcare management—all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:opacity-90 shadow-lg hover:shadow-xl transition-all text-white">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
                    Sign In
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-gray-500 mt-4">No credit card required • Free forever</p>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
              <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">10K+</div>
                <div className="text-sm text-gray-600">Active Patients</div>
              </div>
              <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">500+</div>
                <div className="text-sm text-gray-600">Partner Clinics</div>
              </div>
              <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">50K+</div>
                <div className="text-sm text-gray-600">Appointments</div>
              </div>
              <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-2">99%</div>
                <div className="text-sm text-gray-600">Satisfaction</div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              <div className="group text-center p-8 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 hover:shadow-xl transition-all duration-300 border border-cyan-200">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Search className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Smart Search</h3>
                <p className="text-gray-600 leading-relaxed">
                  Find the perfect clinic by disease, specialty, location, or availability. AI-powered recommendations help you make the right choice.
                </p>
              </div>

              <div className="group text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-all duration-300 border border-purple-200">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Calendar className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Instant Booking</h3>
                <p className="text-gray-600 leading-relaxed">
                  View real-time availability, see available slots, and book appointments instantly. No phone calls, no waiting.
                </p>
              </div>

              <div className="group text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-xl transition-all duration-300 border border-blue-200">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Clock className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Auto Reminders</h3>
                <p className="text-gray-600 leading-relaxed">
                  Never miss an appointment. Automated reminders and follow-up scheduling keep your health on track.
                </p>
              </div>
            </div>

            {/* How It Works */}
            <div className="mb-20">
              <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { step: "1", title: "Sign Up", desc: "Create your account in seconds" },
                  { step: "2", title: "Search", desc: "Find clinics by specialty or location" },
                  { step: "3", title: "Book", desc: "Choose your preferred time slot" },
                  { step: "4", title: "Visit", desc: "Get reminders and manage appointments" },
                ].map((item) => (
                  <div key={item.step} className="text-center p-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* For Patients & Hospitals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-20">
              <div className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl">
                    <Heart className="h-6 w-6 text-cyan-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">For Patients</h2>
                </div>
                <ul className="space-y-4 text-gray-600">
                  {[
                    "Search clinics by disease, specialty, or location",
                    "View real-time slot availability",
                    "Book appointments instantly",
                    "Manage appointments and follow-ups",
                    "Get automated reminders",
                    "Access medical history",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/sign-up">
                  <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600">
                    Get Started as Patient
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">For Hospitals</h2>
                </div>
                <ul className="space-y-4 text-gray-600">
                  {[
                    "Manage multiple clinics and departments",
                    "Create and manage appointment slots",
                    "View all appointments in one dashboard",
                    "Schedule follow-ups for patients",
                    "Track patient history",
                    "Generate reports and analytics",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/sign-up">
                  <Button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600">
                    Get Started as Hospital
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Testimonials */}
            <div className="mb-20">
              <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">What Our Users Say</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: "Sarah Johnson", role: "Patient", text: "medcAIr made finding and booking appointments so easy! No more waiting on hold.", rating: 5 },
                  { name: "Dr. Michael Chen", role: "Hospital Admin", text: "This platform has streamlined our appointment management. Highly recommended!", rating: 5 },
                  { name: "Emily Rodriguez", role: "Patient", text: "The reminders and follow-up features are a game-changer. Never miss an appointment!", rating: 5 },
                ].map((testimonial, idx) => (
                  <div key={idx} className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Enhanced Footer */}
        <footer className="w-full border-t bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope className="h-6 w-6 text-cyan-600" />
                  <span className="text-xl font-bold text-gray-900">medcAIr</span>
                </div>
                <p className="text-sm text-gray-600">
                  Your intelligent healthcare management platform.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-4 text-gray-900">Product</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><Link href="#" className="hover:text-cyan-600">Features</Link></li>
                  <li><Link href="#" className="hover:text-cyan-600">Pricing</Link></li>
                  <li><Link href="#" className="hover:text-cyan-600">Security</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4 text-gray-900">Company</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><Link href="#" className="hover:text-cyan-600">About</Link></li>
                  <li><Link href="#" className="hover:text-cyan-600">Blog</Link></li>
                  <li><Link href="#" className="hover:text-cyan-600">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4 text-gray-900">Support</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><Link href="#" className="hover:text-cyan-600">Help Center</Link></li>
                  <li><Link href="#" className="hover:text-cyan-600">Documentation</Link></li>
                  <li><Link href="#" className="hover:text-cyan-600">API</Link></li>
                </ul>
              </div>
            </div>
            <div className="pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-600">
                © 2024 medcAIr. All rights reserved.
              </p>
              <p className="text-sm text-gray-600">
            Powered by{" "}
            <a
                  href="https://supabase.com"
              target="_blank"
                  className="font-bold hover:underline text-cyan-600"
              rel="noreferrer"
            >
              Supabase
            </a>
                {" "}and Next.js
          </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
