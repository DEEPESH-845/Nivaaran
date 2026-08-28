"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function StoryCTA({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-6 ${className}`}>
      <h2 className="font-display tracking-[-0.02em] text-paper text-4xl sm:text-5xl md:text-6xl text-center mb-8">
        Ready to make PF simpler?
      </h2>
      <Link 
        href="/"
        className="group relative inline-flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full text-lg font-medium overflow-hidden transition-transform hover:scale-105 active:scale-95"
      >
        <span className="relative z-10">Experience Nivaaran</span>
        <ArrowRight className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1" />
        <div className="absolute inset-0 bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
      </Link>
    </div>
  );
}
