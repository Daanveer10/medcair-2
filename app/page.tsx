"use client";

import Link from "next/link";
import { SplineScene } from "@/components/ui/spline-scene";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { Activity, ArrowRight, CheckCircle, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden font-display">

      {/* Header */}
      <header className="absolute top-0 z-50 w-full p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-10 bg-primary/20 backdrop-blur-md border border-primary/50 rounded-xl flex items-center justify-center text-primary">
              <Activity className="size-6" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">medcAIr</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
                Login
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-full px-6">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Spline Scene Section */}
      <main className="h-screen w-full flex items-center justify-center relative">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="white"
        />

        <div className="flex flex-col lg:flex-row h-full w-full max-w-7xl mx-auto pt-20 lg:pt-0">
          {/* Left Content */}
          <div className="flex-1 p-8 lg:p-16 relative z-10 flex flex-col justify-center text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 w-fit mx-auto lg:mx-0 mb-6 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-medium text-emerald-300 tracking-wide uppercase">AI-Powered Healthcare</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-6 leading-tight">
              Future of <br />
              <span className="text-primary">Medical Care.</span>
            </h1>

            <p className="text-lg text-neutral-300 max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
              Experience the next generation of healthcare with our AI-driven robotics and telemedicine platform. Secure, intelligent, and always available.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mx-auto lg:mx-0">
              <Link href="/patient/dashboard" className="w-full sm:w-auto">
                <Button className="w-full h-12 px-8 text-base bg-white text-black hover:bg-neutral-200 rounded-lg font-bold transition-all">
                  Find a Doctor
                </Button>
              </Link>
              <Link href="/hospital/dashboard" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full h-12 px-8 text-base border-neutral-700 text-white hover:bg-neutral-800 rounded-lg hover:text-white transition-all">
                  For Hospitals
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 text-neutral-400 text-sm font-medium">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-emerald-500" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-500" />
                <span>Instant AI Analysis</span>
              </div>
            </div>
          </div>

          {/* Right Content - Spline Scene */}
          <div className="flex-1 relative h-[50vh] lg:h-auto w-full">
            <div className="absolute inset-0 z-0">
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full"
              />
            </div>
            {/* Overlay Gradient to blend bottom on mobile */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none lg:hidden"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
