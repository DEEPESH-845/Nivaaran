"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface FrameRendererProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  frameCount?: number;
}

export function FrameRenderer({ scrollContainerRef, frameCount = 260 }: FrameRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesCacheRef = useRef<(HTMLImageElement | null)[]>(new Array(frameCount + 1).fill(null));
  const loadStatusRef = useRef<boolean[]>(new Array(frameCount + 1).fill(false));
  
  const stateRef = useRef({
    targetFrame: 1,
    currentFrame: -1,
    isFirstFrameLoaded: false,
    width: 0,
    height: 0,
    dpr: 1
  });

  const [isReady, setIsReady] = useState(false);

  // 1. Image Loading Utility
  const loadImage = (index: number): Promise<void> => {
    if (index < 1 || index > frameCount) return Promise.resolve();
    if (loadStatusRef.current[index]) return Promise.resolve();
    
    return new Promise((resolve) => {
      const img = new Image();
      const indexStr = index.toString().padStart(3, '0');
      img.src = `/Frames/ezgif-frame-${indexStr}.png`;
      
      img.onload = () => {
        imagesCacheRef.current[index] = img;
        loadStatusRef.current[index] = true;
        resolve();
      };
      img.onerror = () => {
        loadStatusRef.current[index] = true; // Mark as processed to avoid infinite retries
        resolve();
      };
    });
  };

  // 2. Intelligent Look-Ahead Preloading
  useEffect(() => {
    let active = true;

    // Load initial chunk immediately (first 10 frames)
    const initPreload = async () => {
      const initialPromises = [];
      for (let i = 1; i <= Math.min(10, frameCount); i++) {
        initialPromises.push(loadImage(i));
      }
      await Promise.all(initialPromises);
      
      if (!active) return;
      stateRef.current.isFirstFrameLoaded = true;
      setIsReady(true); // Trigger effect to setup ScrollTrigger
      
      // Continue loading remaining frames sequentially in background
      for (let i = 11; i <= frameCount; i++) {
        if (!active) break;
        await loadImage(i);
      }
    };
    
    initPreload();

    return () => {
      active = false;
    };
  }, [frameCount]);

  // Priority Loading triggered by scroll
  useEffect(() => {
    // When targetFrame changes significantly, we could bump priority,
    // but the background sequential loader is usually fast enough for local assets.
    // To make it truly look-ahead, we can hook into GSAP ticker.
    const lookAheadLoader = () => {
      const current = Math.round(stateRef.current.targetFrame);
      const radius = 10;
      
      // Try to eagerly load frames immediately around current progress
      for (let i = Math.max(1, current - radius); i <= Math.min(frameCount, current + radius); i++) {
        if (!loadStatusRef.current[i]) {
          loadImage(i);
        }
      }
    };

    gsap.ticker.add(lookAheadLoader);
    return () => gsap.ticker.remove(lookAheadLoader);
  }, [frameCount]);

  // 3. Canvas Render Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false }); // Optimize for no transparency
    if (!canvas || !ctx || !isReady) return;

    const render = () => {
      const state = stateRef.current;
      const targetInt = Math.round(state.targetFrame);
      
      // Only draw if the frame has actually changed
      if (state.currentFrame === targetInt) return;

      // Find the closest loaded frame to prevent flickering during fast scroll
      let imgToDraw: HTMLImageElement | null = null;
      let actualDrawnIndex = targetInt;

      if (imagesCacheRef.current[targetInt]) {
        imgToDraw = imagesCacheRef.current[targetInt];
      } else {
        // Fallback: search backwards for closest loaded frame
        for (let i = targetInt - 1; i >= 1; i--) {
          if (imagesCacheRef.current[i]) {
            imgToDraw = imagesCacheRef.current[i];
            actualDrawnIndex = i;
            break;
          }
        }
      }

      if (!imgToDraw) return; // Wait until at least one frame is ready

      // Handle Resize bounds dynamically without layout thrashing
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);

      if (state.width !== w || state.height !== h || state.dpr !== dpr) {
        canvas.width = w;
        canvas.height = h;
        state.width = w;
        state.height = h;
        state.dpr = dpr;
      }

      // Draw
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h); // Clear with black

      const imgRatio = imgToDraw.width / imgToDraw.height;
      const canvasRatio = w / h;
      
      let drawWidth = w;
      let drawHeight = h;
      let offsetX = 0;
      let offsetY = 0;

      if (canvasRatio > imgRatio) {
        drawHeight = w / imgRatio;
        offsetY = (h - drawHeight) / 2;
      } else {
        drawWidth = h * imgRatio;
        offsetX = (w - drawWidth) / 2;
      }

      ctx.drawImage(imgToDraw, offsetX, offsetY, drawWidth, drawHeight);
      
      // Update state
      state.currentFrame = actualDrawnIndex;
    };

    // Add to GSAP Ticker for synchronized high-performance rendering
    gsap.ticker.add(render);

    // Initial render
    render();

    return () => {
      gsap.ticker.remove(render);
    };
  }, [isReady]);

  // 4. ScrollTrigger Orchestration
  useEffect(() => {
    if (!isReady || !scrollContainerRef.current) return;

    const st = ScrollTrigger.create({
      trigger: scrollContainerRef.current,
      start: "top top",
      end: "+=800%", 
      pin: true,
      scrub: 1.2, // Increased from 0.5 for smoother scroll interpolation
      onUpdate: (self) => {
        // Map 0-1 progress to 1-260 frames
        const frame = 1 + self.progress * (frameCount - 1);
        stateRef.current.targetFrame = frame;
      }
    });

    // Handle resize events to force re-render
    const ro = new ResizeObserver(() => {
      stateRef.current.currentFrame = -1; // invalidate current frame to force redraw
    });
    
    if (scrollContainerRef.current) {
      ro.observe(scrollContainerRef.current);
    }

    return () => {
      st.kill();
      ro.disconnect();
    };
  }, [isReady, scrollContainerRef, frameCount]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
    />
  );
}
