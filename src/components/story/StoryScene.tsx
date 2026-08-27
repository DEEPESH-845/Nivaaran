"use client";

import React, { forwardRef } from "react";
import Image from "next/image";

interface StorySceneProps {
  id?: string;
  framePath: string;
  className?: string;
  children?: React.ReactNode;
  imgClassName?: string;
}

export const StoryScene = forwardRef<HTMLDivElement, StorySceneProps>(
  ({ id, framePath, className = "", children, imgClassName = "" }, ref) => {
    return (
      <div
        ref={ref}
        id={id}
        className={`story-frame-container ${className}`}
      >
        <Image
          src={framePath}
          alt="Cinematic Story Frame"
          fill
          priority
          sizes="100vw"
          className={`object-cover object-center ${imgClassName}`}
        />
        {children && (
          <div className="absolute inset-0 z-10 flex flex-col justify-center items-center">
            {children}
          </div>
        )}
      </div>
    );
  }
);

StoryScene.displayName = "StoryScene";
