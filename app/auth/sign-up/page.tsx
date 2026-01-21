import { SignUpForm } from "@/components/sign-up-form";
import { Stethoscope } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col font-display">
      {/* Navbar */}
      <nav className="w-full flex justify-center border-b border-[#e6f3f4] dark:border-gray-700 h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
          <div className="flex gap-5 items-center font-semibold">
            <Link href={"/"} className="flex items-center gap-2 group">
              <div className="size-8 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                <span className="material-symbols-outlined text-xl">health_metrics</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-[#0c1b1d] dark:text-white">Healio<span className="text-primary">.doc</span></span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Sign Up Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}
