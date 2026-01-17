import { LoginForm } from "@/components/login-form";
import { Stethoscope } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="w-full flex justify-center border-b border-gray-200 h-16 bg-white sticky top-0 z-50 shadow-sm">
        <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
          <div className="flex gap-5 items-center font-semibold">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-600 rounded-lg">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <Link href={"/"} className="text-xl font-bold text-black">
                medcAIr
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
