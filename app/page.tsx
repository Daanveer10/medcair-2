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
        <section className="relative pt-16 pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div>
                  <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase bg-white/10 text-primary-foreground rounded-full border border-white/10 backdrop-blur-sm">
                    Next-Gen Healthcare
                  </span>
                  <h1 className="text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-white">
                    Your Health, <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-primary">Simplified.</span>
                  </h1>
                  <p className="mt-6 text-lg text-gray-300 leading-relaxed max-w-lg">
                    Connect with top specialists, manage medical records securely, and get AI-powered health insights in one platform.
                  </p>
                </div>
                {/* Search Component */}
                <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 max-w-xl shadow-2xl">
                  <div className="flex flex-col md:flex-row items-center gap-2">
                    <div className="flex items-center w-full px-4 py-3 gap-3 border-b md:border-b-0 md:border-r border-white/20">
                      <MapPin className="size-5 text-gray-400" />
                      <input type="text" placeholder="Your City" className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-gray-400 text-white" />
                    </div>
                    <div className="flex items-center w-full px-4 py-3 gap-3">
                      <Search className="size-5 text-gray-400" />
                      <input type="text" placeholder="Search doctors, clinics..." className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-gray-400 text-white" />
                    </div>
                    <Link href="/patient/dashboard">
                      <button className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap shadow-lg">
                        Find Now
                      </button>
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex -space-x-3">
                    <div className="w-10 h-10 rounded-full border-2 border-primary bg-slate-200 bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBh3764arRW9-UZ7rFIj-3qsTvQ9gsQcpYFWEX4CMer5i96BjHtupsS_oswY02rLMdIBP-EpoFF73c0hEpeHYR1SnMUAiDZaIuC6hVz3xOY9sK2kUYDzWfL9qB7vcrTJEQWV5RugNuDBtv8e0s3KLgSQltrV-6FaO4menoqvEs30sirSF6XbhhwVLCyd_NZ-IaMf6Ywgx0GSga7ISa3VgBYGqxbDeOvigepqiTHHpHyyeEH587661ORHHpGG-zfJdWC6kJS93oesQ')" }}></div>
                    <div className="w-10 h-10 rounded-full border-2 border-primary bg-slate-200 bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDZGJbLWt8qhMKijYvYYKtJ27QGS2cT97PVx0OTloKBV_grblVdU7KvaiNHSzodkVrJXksiOenfYDPnoTQ7FMMPoVGcnqr-P59rWTISUS50iOEDkUKBZeZnUAIce_fuKbFmhaZ5Dy0jg81qN5j0Eoe5Zri2MmIQ2cJgK2Ca6HKddru9kX3u85aBx_6ye44xalsIyqcRNNcoa0iNVI6cs-Tg7AgTWpyYF8DMRDjzlO3Nd9emWXpWlLX61HL-LbFE-6kxjVTFL13qBw')" }}></div>
                    <div className="w-10 h-10 rounded-full border-2 border-primary bg-slate-200 bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD0mkhp3IvR3Rywr-FuqWpxn7DTCvrJNd0g7zAo3fVPgh4-ep091VsWl0xScj_oNub2V9sODfM2N0zpBYxRWX6npj_MdkPxahwwAx3pQxwW4SBQv6vnXxRbRfdAWqgrepkZpUNySkhZT4P8OuGPtlebgDIs6_93CNn5iTaJLc7TaZQt_zDH5zJjTWiBv0o2k87OiWj9r9TbC5caVjjr6ryyHHtDC-M0wuDBag_9Jjy-4S11kQou0ShvPi1z7KwuVx-_ckLNpYC0eg')" }}></div>
                  </div>
                  <p className="text-sm font-medium text-gray-300">
                    Joined by <span className="text-white font-bold">10,000+</span> top medical professionals
                  </p>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSNpjkgHyB7Br7jetQgTz1iMCfB4oMZnt2EJ112Izcaq1yVkHs8pVnjuJas_kanGUfehMF0WYqzBSZ-fsFz_XyVZi_7qAJUDTGxAP_u3F4SAQnn2RdEZRFZbBIPAu6OgTAche-HiWpmw_DuTBwehwwtNq8pEEwB4UWYI9pZNBxT0nROliuzgJXWwNc8e5J6YsNOy931tDvVBOj0l4i2SWvD_iMNQQci7TViNAu8dz7I0E6GMGTeFhs4vYfrPw4iN7Wh55YBznqvg" alt="Healthcare Professional" className="w-full h-auto object-cover aspect-[4/5] rounded-2xl" />
                  <div className="absolute bottom-6 left-6 right-6 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/20">
                    <div className="flex items-center gap-4">
                      <div className="size-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30">
                        <BadgeCheck className="size-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Now</p>
                        <p className="font-bold text-white">Instant Video Consultation</p>
                      </div>
                    </div>
                  </div>
                </div>
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
