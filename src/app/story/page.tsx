import React from "react";
import { Metadata } from "next";
import { CinematicSequence } from "@/components/cinematic/CinematicSequence";

export const metadata: Metadata = {
  title: "Nivaaran — Experience the Journey",
  description: "Follow Arjun's journey to a simpler PF claim process.",
};

export default function StoryPage() {
  return (
    <div className="relative w-full min-h-dvh overflow-x-clip bg-black">
      <CinematicSequence />
    </div>
  );
}
