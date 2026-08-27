import React from "react";
import { Metadata } from "next";
import { CinematicSequence } from "@/components/cinematic/CinematicSequence";
import "./story.css";

export const metadata: Metadata = {
  title: "Nivaaran — Experience the Journey",
  description: "Follow Arjun's journey to a simpler PF claim process.",
};

export default function StoryPage() {
  return (
    <div className="relative z-50 w-full min-h-screen bg-black">
      <CinematicSequence />
    </div>
  );
}
