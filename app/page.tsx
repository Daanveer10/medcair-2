import Link from "next/link";
import { AuthButton } from "@/components/auth-button"; // Assuming this or similar exists or we manually build buttons
import { hasEnvVars } from "@/lib/utils"; // Keep existing checks if needed, or simplify

export default function Home() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      {/* Sticky Navigation */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined">health_metrics</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-primary">Healio</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/patient/dashboard" className="text-sm font-semibold hover:text-primary transition-colors">Find Doctors</Link>
              <Link href="/patient/dashboard" className="text-sm font-semibold hover:text-primary transition-colors">Video Consult</Link>
              <Link href="#" className="text-sm font-semibold hover:text-primary transition-colors">Medicines</Link>
              <Link href="#" className="text-sm font-semibold hover:text-primary transition-colors">Records</Link>
            </nav>
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <button className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary">Log in</button>
              </Link>
              <Link href="/auth/sign-up">
                <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all">
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
                  <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase bg-primary/10 text-primary rounded-full">
                    Next-Gen Healthcare
                  </span>
                  <h1 className="text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white">
                    Your Health, <br /><span className="text-primary">Simplified.</span>
                  </h1>
                  <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                    Connect with top specialists, manage medical records securely, and get AI-powered health insights in one platform.
                  </p>
                </div>
                {/* Search Component */}
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl soft-shadow border border-slate-100 dark:border-slate-700 max-w-xl">
                  <div className="flex flex-col md:flex-row items-center gap-2">
                    <div className="flex items-center w-full px-4 py-3 gap-3 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700">
                      <span className="material-symbols-outlined text-slate-400">location_on</span>
                      <input type="text" placeholder="Your City" className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-slate-400" />
                    </div>
                    <div className="flex items-center w-full px-4 py-3 gap-3">
                      <span className="material-symbols-outlined text-slate-400">search</span>
                      <input type="text" placeholder="Search doctors, clinics..." className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-slate-400" />
                    </div>
                    <Link href="/patient/dashboard">
                      <button className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap">
                        Find Now
                      </button>
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex -space-x-3">
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBh3764arRW9-UZ7rFIj-3qsTvQ9gsQcpYFWEX4CMer5i96BjHtupsS_oswY02rLMdIBP-EpoFF73c0hEpeHYR1SnMUAiDZaIuC6hVz3xOY9sK2kUYDzWfL9qB7vcrTJEQWV5RugNuDBtv8e0s3KLgSQltrV-6FaO4menoqvEs30sirSF6XbhhwVLCyd_NZ-IaMf6Ywgx0GSga7ISa3VgBYGqxbDeOvigepqiTHHpHyyeEH587661ORHHpGG-zfJdWC6kJS93oesQ')" }}></div>
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDZGJbLWt8qhMKijYvYYKtJ27QGS2cT97PVx0OTloKBV_grblVdU7KvaiNHSzodkVrJXksiOenfYDPnoTQ7FMMPoVGcnqr-P59rWTISUS50iOEDkUKBZeZnUAIce_fuKbFmhaZ5Dy0jg81qN5j0Eoe5Zri2MmIQ2cJgK2Ca6HKddru9kX3u85aBx_6ye44xalsIyqcRNNcoa0iNVI6cs-Tg7AgTWpyYF8DMRDjzlO3Nd9emWXpWlLX61HL-LbFE-6kxjVTFL13qBw')" }}></div>
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD0mkhp3IvR3Rywr-FuqWpxn7DTCvrJNd0g7zAo3fVPgh4-ep091VsWl0xScj_oNub2V9sODfM2N0zpBYxRWX6npj_MdkPxahwwAx3pQxwW4SBQv6vnXxRbRfdAWqgrepkZpUNySkhZT4P8OuGPtlebgDIs6_93CNn5iTaJLc7TaZQt_zDH5zJjTWiBv0o2k87OiWj9r9TbC5caVjjr6ryyHHtDC-M0wuDBag_9Jjy-4S11kQou0ShvPi1z7KwuVx-_ckLNpYC0eg')" }}></div>
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Joined by <span className="text-slate-900 dark:text-white font-bold">10,000+</span> top medical professionals
                  </p>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="relative rounded-2xl overflow-hidden soft-shadow">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSNpjkgHyB7Br7jetQgTz1iMCfB4oMZnt2EJ112Izcaq1yVkHs8pVnjuJas_kanGUfehMF0WYqzBSZ-fsFz_XyVZi_7qAJUDTGxAP_u3F4SAQnn2RdEZRFZbBIPAu6OgTAche-HiWpmw_DuTBwehwwtNq8pEEwB4UWYI9pZNBxT0nROliuzgJXWwNc8e5J6YsNOy931tDvVBOj0l4i2SWvD_iMNQQci7TViNAu8dz7I0E6GMGTeFhs4vYfrPw4iN7Wh55YBznqvg" alt="Healthcare Professional" className="w-full h-auto object-cover aspect-[4/5] rounded-2xl" />
                  <div className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-4 rounded-xl border border-white/20">
                    <div className="flex items-center gap-4">
                      <div className="size-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined">verified</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Available Now</p>
                        <p className="font-bold text-slate-900 dark:text-white">Instant Video Consultation</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Specialty Carousel */}
        <section className="py-12 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Popular Specialties</h2>
              <a href="#" className="text-sm font-bold text-primary flex items-center gap-1">
                View all <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
              {[
                { icon: "ecg_heart", name: "Cardiology" },
                { icon: "child_care", name: "Pediatrics" },
                { icon: "neurology", name: "Neurology" },
                { icon: "dentistry", name: "Dental" },
                { icon: "dermatology", name: "Dermatology" },
                { icon: "orthopedics", name: "Orthopedics" },
                { icon: "female", name: "Gynecology" }
              ].map((specialty, idx) => (
                <div key={idx} className="flex-none w-32 group cursor-pointer text-center">
                  <div className="size-20 mx-auto bg-background-light dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-primary text-3xl">{specialty.icon}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{specialty.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Services Grid */}
        <section className="py-20 bg-background-light dark:bg-background-dark">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Our Core Services</h2>
              <p className="text-slate-600 dark:text-slate-400">Everything you need to manage your health in one secure, unified ecosystem.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Book Appointment */}
              <div className="group bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 hover:border-primary/50 transition-all soft-shadow">
                <div className="size-14 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-blue-600 text-3xl">calendar_month</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Book Appointment</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                  Schedule in-person visits with top-rated specialists at your convenience. Real-time availability and instant confirmation.
                </p>
                <button className="text-primary font-bold text-sm flex items-center gap-2">
                  Book Now <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              {/* Consult Online */}
              <div className="group bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 hover:border-primary/50 transition-all soft-shadow">
                <div className="size-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-emerald-600 text-3xl">videocam</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Consult Online</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                  Connect with board-certified doctors via high-quality video calls 24/7. Get prescriptions and medical advice instantly.
                </p>
                <button className="text-primary font-bold text-sm flex items-center gap-2">
                  Start Consultation <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              {/* AI Assistant */}
              <div className="group bg-slate-900 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50 transition-all soft-shadow relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
                <div className="size-14 bg-primary/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-3xl">smart_toy</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">AI Health Assistant</h3>
                <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                  Get personalized wellness insights and symptom guidance powered by our advanced medical AI. Available anytime, anywhere.
                </p>
                <button className="text-primary font-bold text-sm flex items-center gap-2">
                  Try AI Assistant <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section / Records Management */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-primary rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                  <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white"></path>
                </svg>
              </div>
              <div className="grid lg:grid-cols-2 items-center">
                <div className="p-12 lg:p-20 text-white space-y-8">
                  <h2 className="text-4xl font-extrabold leading-tight">Your Medical Records, <br />Secure and Portable.</h2>
                  <p className="text-primary/10 bg-white/10 p-4 rounded-xl text-lg backdrop-blur-sm">
                    "Healio has completely changed how I manage my family's health. Having all prescriptions and reports in one place is a lifesaver."
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-emerald-300">check_circle</span>
                      <span className="font-medium">End-to-end encrypted storage</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-emerald-300">check_circle</span>
                      <span className="font-medium">Easy sharing with specialists</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-emerald-300">check_circle</span>
                      <span className="font-medium">Automated health history timeline</span>
                    </div>
                  </div>
                  <button className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all shadow-xl shadow-primary/20">
                    Get Started Free
                  </button>
                </div>
                <div className="hidden lg:block h-full relative p-12">
                  <div className="bg-white/10 backdrop-blur p-8 rounded-2xl border border-white/20 h-full flex flex-col justify-center">
                    <div className="bg-white rounded-xl p-4 mb-4 soft-shadow flex items-center gap-4 translate-x-12">
                      <div className="size-10 bg-blue-100 rounded flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-600">description</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">MAY 12, 2023</p>
                        <p className="text-sm font-bold text-slate-900">Lab Results - Cardiology</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 mb-4 soft-shadow flex items-center gap-4 -translate-x-4">
                      <div className="size-10 bg-emerald-100 rounded flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-600">prescriptions</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">APR 28, 2023</p>
                        <p className="text-sm font-bold text-slate-900">Digital Prescription - Dr. Sarah J.</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 soft-shadow flex items-center gap-4 translate-x-8">
                      <div className="size-10 bg-amber-100 rounded flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-600">vaccines</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">MAR 15, 2023</p>
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
      <footer className="bg-white dark:bg-slate-900 pt-20 pb-10 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2 lg:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <span className="material-symbols-outlined">health_metrics</span>
                </div>
                <span className="text-xl font-extrabold tracking-tight text-primary">Healio</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm leading-relaxed">
                A comprehensive healthcare platform dedicated to simplifying medical access and management for patients and professionals worldwide.
              </p>
              <div className="flex gap-4">
                <a href="#" className="size-10 bg-background-light dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">public</span>
                </a>
                <a href="#" className="size-10 bg-background-light dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">share</span>
                </a>
                <a href="#" className="size-10 bg-background-light dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">videocam</span>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6">For Patients</h4>
              <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
                <li><a href="#" className="hover:text-primary">Search for Doctors</a></li>
                <li><a href="#" className="hover:text-primary">Book Appointments</a></li>
                <li><a href="#" className="hover:text-primary">Online Consultations</a></li>
                <li><a href="#" className="hover:text-primary">Health Records</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6">For Doctors</h4>
              <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
                <li><a href="#" className="hover:text-primary">Join Healio</a></li>
                <li><a href="#" className="hover:text-primary">Practice Management</a></li>
                <li><a href="#" className="hover:text-primary">Doctor Profile</a></li>
                <li><a href="#" className="hover:text-primary">Resources</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
                <li><a href="#" className="hover:text-primary">Help Center</a></li>
                <li><a href="#" className="hover:text-primary">Contact Us</a></li>
                <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary">Terms of Use</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">© 2024 Healio Healthcare Platform. All rights reserved.</p>
            <div className="flex gap-6">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTWa_noFzpB2LkCtJ59nDquejA1xnuz4KFGpoZ-QFGPiS59hkntt2U8_95tEyChvDkb8-oBhZcv_7CsTvc2eiaUp88hbpdUiNABaNkJu_IHFsMuwTYg7Pp1cvmehpraKumeELW-lH2hjyXEP2iReTOSK5gyy9UboZd9yLRshKP4bAlVqZzLIOQF-7LZbSt1_uW32ciGwo0UUwbgII8IxeUPp_iq_ekxbD9-SIxZtPiGRdGLED3_iVkV9RwrixpXoOCBzX2atL7vg" alt="App Store" />
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBa8SwT8OpGRA2I1J5rXjkMt9akhM4dKtS4lc8AC8Mw3wXJNp7rQ_e9NzHBjwhcM_skEuPS9yP8PmAtMX7aw40OWjtNYo6FkOOFnDpyf_lGKkIbO_EKc5XSTxS7ACegv2NYL63rsZ1AMo7blhb2n2LqpnS25_E4tFNZhH1lGfzlb5XkRBRzVOLKEnpGCRDcb0UVsvhSZkbgOTd9jPirtx1t8MvNjzx3gTQS_fr1wUnMut5iGQBORYYZ_7S3DPHYnbcx7IO8KAXajA" alt="Play Store" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
