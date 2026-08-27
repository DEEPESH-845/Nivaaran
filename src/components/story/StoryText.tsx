"use client";

import React, { ReactNode } from "react";

interface StoryTextProps {
  children: ReactNode;
  className?: string;
}

export function StoryText({ children, className = "" }: StoryTextProps) {
  return (
    <div className={`story-editorial-text text-center px-4 max-w-4xl mx-auto drop-shadow-md ${className}`}>
      {children}
    </div>
  );
}
