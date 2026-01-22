import Link from "next/link";
import ShaderBackground from "@/components/ui/shader-background";
import {
  Activity,
  MapPin,
  Search,
  BadgeCheck,
  ArrowRight,
  HeartPulse,
  Baby,
  Brain,
  Stethoscope,
  User,
  Calendar,
  Video,
  Bot,
  CheckCircle,
  FileText,
  Pill,
  Syringe,
  Globe,
  Share2
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen font-display text-white relative">
      <ShaderBackground />

      {/* Sticky Navigation */}
      <header className="sticky top-0 z-50 w-full bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-primary/80 backdrop-blur rounded-lg flex items-center justify-center text-white">
                <Activity className="size-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">medcAIr</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/patient/dashboard" className="text-sm font-semibold text-gray-200 hover:text-white transition-colors">Find Doctors</Link>
              <Link href="/patient/dashboard" className="text-sm font-semibold text-gray-200 hover:text-white transition-colors">Video Consult</Link>
              <Link href="#" className="text-sm font-semibold text-gray-200 hover:text-white transition-colors">Medicines</Link>
              <Link href="#" className="text-sm font-semibold text-gray-200 hover:text-white transition-colors">Records</Link>
            </nav>
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <button className="text-sm font-semibold text-gray-200 hover:text-white">Log in</button>
              </Link>
              <Link href="/auth/sign-up">
                <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20">
                  Sign Up
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-32 overflow-hidden flex items-center min-h-[80vh]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
            <div className="max-w-4xl mx-auto text-center space-y-10">
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-1000">
                <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                  Next-Gen Healthcare
                </span>
                <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-xl">
                  Your Health, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 animate-gradient-x">
                    Simplified & Secure.
                  </span>
                </h1>
                <p className="mt-8 text-xl text-indigo-100/80 leading-relaxed max-w-2xl mx-auto">
                  Connect with top specialists, manage medical records securely, and get AI-powered health insights in one unified ecosystem.
                </p>
              </div>

              {/* Search Component */}
              <div className="bg-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/10 max-w-2xl mx-auto shadow-2xl ring-1 ring-white/10">
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <div className="flex items-center w-full px-4 py-3 gap-3 bg-white/5 rounded-xl border border-white/5 focus-within:bg-white/10 focus-within:border-white/20 transition-all">
                    <MapPin className="size-5 text-indigo-300" />
                    <input
                      type="text"
                      placeholder="Your City"
                      className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-indigo-300/50 text-white"
                    />
                  </div>
                  <div className="flex items-center w-full px-4 py-3 gap-3 bg-white/5 rounded-xl border border-white/5 focus-within:bg-white/10 focus-within:border-white/20 transition-all">
                    <Search className="size-5 text-indigo-300" />
                    <input
                      type="text"
                      placeholder="Search doctors..."
                      className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-indigo-300/50 text-white"
                    />
                  </div>
                  <Link href="/patient/dashboard" className="w-full md:w-auto">
                    <button className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap shadow-lg shadow-indigo-500/30">
                      Find Now
                    </button>
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 pt-4">
                <div className="flex -space-x-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`size-12 rounded-full border-2 border-indigo-950 bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-white relative z-${10 - i}`}>
                      <User className="size-6 text-indigo-300" />
                    </div>
                  ))}
                </div>
                <p className="text-sm font-medium text-indigo-200">
                  Trusted by <span className="text-white font-bold">10,000+</span> professionals
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Specialty Carousel - Glassmorphism */}
        <section className="py-12 bg-black/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Popular Specialties</h2>
              <a href="#" className="text-sm font-bold text-primary flex items-center gap-1">
                View all <ArrowRight className="size-4" />
              </a>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
              {[
                { icon: HeartPulse, name: "Cardiology" },
                { icon: Baby, name: "Pediatrics" },
                { icon: Brain, name: "Neurology" },
                { icon: Stethoscope, name: "Dental" },
                { icon: User, name: "Dermatology" },
                { icon: Activity, name: "Orthopedics" },
                { icon: User, name: "Gynecology" }
              ].map((specialty, idx) => {
                const Icon = specialty.icon;
                return (
                  <div key={idx} className="flex-none w-32 group cursor-pointer text-center">
                    <div className="size-20 mx-auto bg-white/10 backdrop-blur rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors border border-white/10">
                      <Icon className="size-8 text-primary" />
                    </div>
                    <p className="text-sm font-bold text-gray-300 group-hover:text-white">{specialty.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Core Services Grid */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-extrabold text-white mb-4">Our Core Services</h2>
              <p className="text-gray-300">Everything you need to manage your health in one secure, unified ecosystem.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Book Appointment */}
              <div className="group bg-white/5 backdrop-blur rounded-2xl p-8 border border-white/10 hover:border-primary/50 transition-all hover:-translate-y-1">
                <div className="size-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 border border-blue-500/30">
                  <Calendar className="size-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Book Appointment</h3>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                  Schedule in-person visits with top-rated specialists at your convenience. Real-time availability and instant confirmation.
                </p>
                <button className="text-primary font-bold text-sm flex items-center gap-2">
                  Book Now <ArrowRight className="size-4" />
                </button>
              </div>
              {/* Consult Online */}
              <div className="group bg-white/5 backdrop-blur rounded-2xl p-8 border border-white/10 hover:border-primary/50 transition-all hover:-translate-y-1">
                <div className="size-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/30">
                  <Video className="size-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Consult Online</h3>
                <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                  Connect with board-certified doctors via high-quality video calls 24/7. Get prescriptions and medical advice instantly.
                </p>
                <button className="text-primary font-bold text-sm flex items-center gap-2">
                  Start Consultation <ArrowRight className="size-4" />
                </button>
              </div>
              {/* AI Assistant */}
              <div className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur rounded-2xl p-8 border border-primary/20 transition-all hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
                <div className="size-14 bg-primary/20 rounded-xl flex items-center justify-center mb-6 border border-primary/30">
                  <Bot className="size-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">AI Health Assistant</h3>
                <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                  Get personalized wellness insights and symptom guidance powered by our advanced medical AI. Available anytime, anywhere.
                </p>
                <button className="text-primary font-bold text-sm flex items-center gap-2">
                  Try AI Assistant <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section / Records Management */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-primary/90 backdrop-blur rounded-3xl overflow-hidden relative border border-white/10">
              <div className="grid lg:grid-cols-2 items-center">
                <div className="p-12 lg:p-20 text-white space-y-8">
                  <h2 className="text-4xl font-extrabold leading-tight">Your Medical Records, <br />Secure and Portable.</h2>
                  <p className="text-white/80 bg-black/10 p-4 rounded-xl text-lg backdrop-blur-sm">
                    "medcAIr has completely changed how I manage my family's health. Having all prescriptions and reports in one place is a lifesaver."
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <CheckCircle className="size-6 text-teal-300" />
                      <span className="font-medium">End-to-end encrypted storage</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <CheckCircle className="size-6 text-teal-300" />
                      <span className="font-medium">Easy sharing with specialists</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <CheckCircle className="size-6 text-teal-300" />
                      <span className="font-medium">Automated health history timeline</span>
                    </div>
                  </div>
                  <button className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl">
                    Get Started Free
                  </button>
                </div>
                <div className="hidden lg:block h-full relative p-12">
                  <div className="bg-white/10 backdrop-blur p-8 rounded-2xl border border-white/20 h-full flex flex-col justify-center">
                    <div className="bg-white/95 rounded-xl p-4 mb-4 shadow-lg flex items-center gap-4 translate-x-12">
                      <div className="size-10 bg-blue-100 rounded flex items-center justify-center">
                        <FileText className="size-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500">MAY 12, 2023</p>
                        <p className="text-sm font-bold text-slate-900">Lab Results - Cardiology</p>
                      </div>
                    </div>
                    <div className="bg-white/95 rounded-xl p-4 mb-4 shadow-lg flex items-center gap-4 -translate-x-4">
                      <div className="size-10 bg-emerald-100 rounded flex items-center justify-center">
                        <Pill className="size-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500">APR 28, 2023</p>
                        <p className="text-sm font-bold text-slate-900">Digital Prescription - Dr. Sarah J.</p>
                      </div>
                    </div>
                    <div className="bg-white/95 rounded-xl p-4 shadow-lg flex items-center gap-4 translate-x-8">
                      <div className="size-10 bg-amber-100 rounded flex items-center justify-center">
                        <Syringe className="size-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500">MAR 15, 2023</p>
                        <p className="text-sm font-bold text-slate-900">Vaccination Record</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-md pt-20 pb-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2 lg:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <Activity className="size-5" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-white">medcAIr</span>
              </div>
              <p className="text-gray-400 max-w-sm text-sm leading-relaxed">
                A comprehensive healthcare platform dedicated to simplifying medical access and management for patients and professionals worldwide.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">For Patients</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><a href="#" className="hover:text-primary">Search for Doctors</a></li>
                <li><a href="#" className="hover:text-primary">Book Appointments</a></li>
                <li><a href="#" className="hover:text-primary">Online Consultations</a></li>
                <li><a href="#" className="hover:text-primary">Health Records</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">For Doctors</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><a href="#" className="hover:text-primary">Join medcAIr</a></li>
                <li><a href="#" className="hover:text-primary">Practice Management</a></li>
                <li><a href="#" className="hover:text-primary">Doctor Profile</a></li>
                <li><a href="#" className="hover:text-primary">Resources</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><a href="#" className="hover:text-primary">Help Center</a></li>
                <li><a href="#" className="hover:text-primary">Contact Us</a></li>
                <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary">Terms of Use</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-400">© 2024 medcAIr Healthcare Platform. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="text-xs text-gray-500">App Store & Play Store</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
