"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { StoryScene } from "./StoryScene";
import { StoryText } from "./StoryText";
import { StoryNotification } from "./StoryNotification";
import { StoryVerificationUI } from "./StoryVerificationUI";
import { StoryProgressTracker } from "./StoryProgressTracker";
import { StoryCTA } from "./StoryCTA";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function StoryController() {
  const container = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  
  // Refs for specific animation elements
  const scene1Ref = useRef<HTMLDivElement>(null);
  const text1aRef = useRef<HTMLHeadingElement>(null);
  const text1bRef = useRef<HTMLParagraphElement>(null);
  
  const scene2Ref = useRef<HTMLDivElement>(null);
  const text2Ref = useRef<HTMLDivElement>(null);
  
  const scene3Ref = useRef<HTMLDivElement>(null);
  const text3Ref = useRef<HTMLDivElement>(null);
  
  const scene4Ref = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const scene5Ref = useRef<HTMLDivElement>(null);
  const scene6Ref = useRef<HTMLDivElement>(null);
  const verificationUIRef = useRef<HTMLDivElement>(null);
  
  const scene7Ref = useRef<HTMLDivElement>(null);
  const text7Ref = useRef<HTMLDivElement>(null);
  
  const scene8Ref = useRef<HTMLDivElement>(null);
  const text8Ref = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const scene9Ref = useRef<HTMLDivElement>(null);
  const text9Ref = useRef<HTMLDivElement>(null);
  
  const navRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    // Hide all scenes initially except the first one
    gsap.set([scene2Ref.current, scene3Ref.current, scene4Ref.current, scene5Ref.current, scene6Ref.current, scene7Ref.current, scene8Ref.current, scene9Ref.current], { opacity: 0 });
    gsap.set(scene1Ref.current, { opacity: 1, zIndex: 10 });
    gsap.set(scene2Ref.current, { zIndex: 9 });
    gsap.set(scene3Ref.current, { zIndex: 8 });
    gsap.set(scene4Ref.current, { zIndex: 7 });
    gsap.set(scene5Ref.current, { zIndex: 6 });
    gsap.set(scene6Ref.current, { zIndex: 5 });
    gsap.set(scene7Ref.current, { zIndex: 4 });
    gsap.set(scene8Ref.current, { zIndex: 3 });
    gsap.set(scene9Ref.current, { zIndex: 2 });
    
    // Initial text states
    gsap.set([text1aRef.current, text1bRef.current], { y: 30, opacity: 0 });
    gsap.set(text2Ref.current, { y: 50, opacity: 0 });
    gsap.set(text3Ref.current, { scale: 0.9, opacity: 0 });
    gsap.set(notificationRef.current, { y: 20, opacity: 0, scale: 0.9 });
    gsap.set(verificationUIRef.current, { y: 50, opacity: 0 });
    
    const verifItems = verificationUIRef.current?.querySelectorAll(".verification-item");
    const verifChecks = verificationUIRef.current?.querySelectorAll(".verification-check");
    if (verifItems && verifChecks) {
      gsap.set(verifItems, { y: 20, opacity: 0 });
      gsap.set(verifChecks, { scale: 0, opacity: 0 });
    }

    gsap.set(text7Ref.current, { y: 30, opacity: 0 });
    gsap.set(text8Ref.current, { y: 30, opacity: 0 });
    gsap.set(progressRef.current, { x: -30, opacity: 0 });
    gsap.set(text9Ref.current, { y: 30, opacity: 0 });

    if (progressRef.current) {
      const dots = progressRef.current.querySelectorAll(".progress-dot");
      const inners = progressRef.current.querySelectorAll(".progress-dot > div");
      const texts = progressRef.current.querySelectorAll("span");
      const lines = progressRef.current.querySelectorAll(".progress-line");
      gsap.set(dots, { borderColor: "rgba(255,255,255,0.1)" });
      gsap.set(inners, { backgroundColor: "transparent" });
      gsap.set(texts, { color: "rgba(255,255,255,0.4)" });
      gsap.set(lines, { backgroundColor: "rgba(255,255,255,0.1)" });
      gsap.set(dots, { opacity: 0 }); // Parent wrapper opacity
    }

    // Intro Animation (independent of scroll)
    gsap.fromTo(scene1Ref.current?.querySelector("img") as Element, 
      { scale: 1.05 }, 
      { scale: 1, duration: 2.5, ease: "power2.out" }
    );
    gsap.to([text1aRef.current, text1bRef.current], {
      y: 0, opacity: 1, duration: 1.5, stagger: 0.3, ease: "power2.out", delay: 0.5
    });

    // Main ScrollTimeline
    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: stageRef.current,
        start: "top top",
        end: "+=1200%", // 12 screen heights of scroll
        scrub: 1,
        pin: true,
        onUpdate: (self) => {
          if (progressTextRef.current) {
            const progress = Math.min(9, Math.max(1, Math.ceil(self.progress * 9)));
            progressTextRef.current.innerText = `0${progress} / 09`;
          }
        }
      }
    });

    // 01 to 02
    masterTl.addLabel("scene2")
      .to([text1aRef.current, text1bRef.current], { y: -30, opacity: 0, duration: 1 })
      .to(scene1Ref.current, { opacity: 0, duration: 2 }, "scene2")
      .to(scene2Ref.current, { opacity: 1, duration: 2, className: "+=is-active story-frame-container" }, "scene2")
      .to(scene1Ref.current, { className: "story-frame-container", duration: 0 }, "scene2+=1")
      .to(text2Ref.current, { y: 0, opacity: 1, duration: 1 }, "scene2+=1");

    // Hold 02
    masterTl.to({}, { duration: 1 });

    // 02 to 03
    masterTl.addLabel("scene3")
      .to(text2Ref.current, { y: -50, opacity: 0, duration: 1 })
      .to(scene2Ref.current, { opacity: 0, duration: 2 }, "scene3")
      .to(scene3Ref.current, { opacity: 1, duration: 2, className: "+=is-active story-frame-container" }, "scene3")
      .to(scene2Ref.current, { className: "story-frame-container", duration: 0 }, "scene3+=1")
      .to(text3Ref.current, { scale: 1, opacity: 1, duration: 1 }, "scene3+=1");

    // Hold 03
    masterTl.to({}, { duration: 1 });

    // 03 to 04 (Notification)
    masterTl.addLabel("scene4")
      .to(text3Ref.current, { scale: 1.1, opacity: 0, duration: 1 })
      .to(scene3Ref.current, { opacity: 0, duration: 2 }, "scene4")
      .to(scene4Ref.current, { opacity: 1, duration: 2, className: "+=is-active story-frame-container" }, "scene4")
      .to(scene3Ref.current, { className: "story-frame-container", duration: 0 }, "scene4+=1")
      // Notification Enters
      .to(notificationRef.current, { y: 0, opacity: 1, scale: 1, duration: 1 }, "scene4+=1")
      // Notification vibrates (simulated in a timeline via rapid small tweens)
      .to(notificationRef.current, { x: -2, duration: 0.05 }, "scene4+=2")
      .to(notificationRef.current, { x: 2, duration: 0.05 }, "scene4+=2.05")
      .to(notificationRef.current, { x: -2, duration: 0.05 }, "scene4+=2.1")
      .to(notificationRef.current, { x: 0, duration: 0.05 }, "scene4+=2.15");

    // Hold 04
    masterTl.to({}, { duration: 1.5 });

    // 04 to 05 (Discovery)
    masterTl.addLabel("scene5")
      .to(notificationRef.current, { y: -20, opacity: 0, duration: 1 })
      .to(scene4Ref.current, { opacity: 0, duration: 2 }, "scene5")
      .to(scene5Ref.current, { opacity: 1, duration: 2, className: "+=is-active story-frame-container" }, "scene5")
      .to(scene4Ref.current, { className: "story-frame-container", duration: 0 }, "scene5+=1");

    // Hold 05
    masterTl.to({}, { duration: 1 });

    // 05 to 06 (Understanding)
    masterTl.addLabel("scene6")
      .to(scene5Ref.current, { opacity: 0, duration: 2 }, "scene6")
      .to(scene6Ref.current, { opacity: 1, duration: 2, className: "+=is-active story-frame-container" }, "scene6")
      .to(scene5Ref.current, { className: "story-frame-container", duration: 0 }, "scene6+=1")
      .to(verificationUIRef.current, { y: 0, opacity: 1, duration: 1 }, "scene6+=1");
      
    if (verifItems && verifChecks) {
      verifItems.forEach((item, i) => {
        masterTl.to(item, { y: 0, opacity: 1, duration: 0.5 }, `scene6+=${1.5 + i * 0.4}`);
        masterTl.to(verifChecks[i], { scale: 1, opacity: 1, duration: 0.3 }, `scene6+=${1.6 + i * 0.4}`);
      });
    }

    // Hold 06
    masterTl.to({}, { duration: 1 });

    // 06 to 07 (Action)
    masterTl.addLabel("scene7")
      .to(verificationUIRef.current, { y: -50, opacity: 0, duration: 1 })
      .to(scene6Ref.current, { opacity: 0, duration: 2 }, "scene7")
      .to(scene7Ref.current, { opacity: 1, duration: 2, className: "+=is-active story-frame-container" }, "scene7")
      .to(scene6Ref.current, { className: "story-frame-container", duration: 0 }, "scene7+=1")
      .to(text7Ref.current, { y: 0, opacity: 1, duration: 1 }, "scene7+=1");

    // Hold 07
    masterTl.to({}, { duration: 1 });

    // 07 to 08 (Tracking)
    masterTl.addLabel("scene8")
      .to(text7Ref.current, { y: -30, opacity: 0, duration: 1 })
      .to(scene7Ref.current, { opacity: 0, duration: 2 }, "scene8")
      .to(scene8Ref.current, { opacity: 1, duration: 2, className: "+=is-active story-frame-container" }, "scene8")
      .to(scene7Ref.current, { className: "story-frame-container", duration: 0 }, "scene8+=1")
      .to(text8Ref.current, { y: 0, opacity: 1, duration: 1 }, "scene8+=1")
      .to(progressRef.current, { x: 0, opacity: 1, duration: 1 }, "scene8+=1.2");

    if (progressRef.current) {
      const dots = progressRef.current.querySelectorAll(".progress-dot");
      const inners = progressRef.current.querySelectorAll(".progress-dot > div");
      const texts = progressRef.current.querySelectorAll("span");
      const lines = progressRef.current.querySelectorAll(".progress-line");
      
      dots.forEach((dot, i) => {
        masterTl.to(dot.parentElement, { opacity: 1, duration: 0.3 }, `scene8+=${1.5 + i * 0.4}`)
                .to(dot, { borderColor: "var(--story-accent)", duration: 0.3 }, `scene8+=${1.5 + i * 0.4}`)
                .to(inners[i], { backgroundColor: "var(--story-accent)", duration: 0.3 }, `scene8+=${1.5 + i * 0.4}`)
                .to(texts[i], { color: "var(--story-foreground)", duration: 0.3 }, `scene8+=${1.5 + i * 0.4}`);
                
        if (i < lines.length) {
          masterTl.to(lines[i], { backgroundColor: "var(--story-accent)", duration: 0.5 }, `scene8+=${1.8 + i * 0.4}`);
        }
      });
    }

    // Hold 08
    masterTl.to({}, { duration: 1.5 });

    // 08 to 09 (Resolution)
    masterTl.addLabel("scene9")
      .to([text8Ref.current, progressRef.current], { y: -30, opacity: 0, duration: 1 })
      .to(scene8Ref.current, { opacity: 0, duration: 2 }, "scene9")
      .to(scene9Ref.current, { opacity: 1, duration: 2, className: "+=is-active story-frame-container" }, "scene9")
      .to(scene8Ref.current, { className: "story-frame-container", duration: 0 }, "scene9+=1")
      .to(text9Ref.current, { y: 0, opacity: 1, duration: 1.5 }, "scene9+=1.5");

    // Hold 09 slightly before allowing unpin
    masterTl.to({}, { duration: 1 });

  }, { scope: container });

  return (
    <div ref={container} className="story-root relative w-full bg-black">
      {/* Navigation Overlay */}
      <div 
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-6 mix-blend-difference text-white pointer-events-none font-medium text-sm tracking-widest uppercase"
      >
        <span>Nivaaran</span>
        <span ref={progressTextRef}>01 / 09</span>
      </div>

      {/* Pinned Stage Container */}
      <div ref={stageRef} className="relative w-full h-[100dvh] overflow-hidden bg-black">
        
        {/* Frame 01: Introduction */}
        <StoryScene ref={scene1Ref} id="scene-01" framePath="/story/frame-01.png" className="is-active">
          <StoryText className="mt-[20vh]">
            <h1 ref={text1aRef} className="text-5xl md:text-7xl mb-4 font-bold tracking-tight">Meet Arjun.</h1>
            <p ref={text1bRef} className="text-xl md:text-3xl font-light text-white/80">He just wants to take care of his PF.</p>
          </StoryText>
        </StoryScene>

        {/* Frame 02: The Problem */}
        <StoryScene ref={scene2Ref} id="scene-02" framePath="/story/frame-02.png">
          <StoryText>
            <div ref={text2Ref}>
              <h2 className="text-4xl md:text-6xl mb-6">Then he tries to navigate<br />the EPFO process.</h2>
              <p className="text-lg md:text-xl text-white/70">It&apos;s a maze of forms and portals.</p>
            </div>
          </StoryText>
        </StoryScene>

        {/* Frame 03: Frustration */}
        <StoryScene ref={scene3Ref} id="scene-03" framePath="/story/frame-03.png" imgClassName="scale-105">
          <StoryText>
            <div ref={text3Ref}>
              <h2 className="text-4xl md:text-5xl mb-4">What should be simple<br />becomes complicated.</h2>
              <p className="text-xl md:text-2xl text-white/80">He doesn&apos;t know what happens next.</p>
            </div>
          </StoryText>
        </StoryScene>

        {/* Frame 04: The Notification */}
        <StoryScene ref={scene4Ref} id="scene-04" framePath="/story/frame-04.png">
          <div className="absolute top-[35%] md:top-[40%] right-[10%] md:right-[20%] z-20">
            <StoryNotification ref={notificationRef} />
          </div>
        </StoryScene>

        {/* Frame 05: Discovery */}
        <StoryScene ref={scene5Ref} id="scene-05" framePath="/story/frame-05.png" />

        {/* Frame 06: Understanding */}
        <StoryScene ref={scene6Ref} id="scene-06" framePath="/story/frame-06.png">
          <div className="flex w-full max-w-5xl px-6 justify-end">
            <StoryVerificationUI ref={verificationUIRef} className="mt-[10vh] md:mr-12" />
          </div>
        </StoryScene>

        {/* Frame 07: Action */}
        <StoryScene ref={scene7Ref} id="scene-07" framePath="/story/frame-07.png">
          <StoryText>
            <div ref={text7Ref} className="bg-black/40 backdrop-blur-md p-8 rounded-2xl border border-white/10">
              <h2 className="text-3xl md:text-5xl">Now he knows exactly what to do.</h2>
            </div>
          </StoryText>
        </StoryScene>

        {/* Frame 08: Tracking */}
        <StoryScene ref={scene8Ref} id="scene-08" framePath="/story/frame-08.png">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-12 w-full max-w-5xl px-6 mt-[20vh]">
            <div ref={text8Ref} className="text-left md:w-1/2">
              <h2 className="story-editorial-text text-4xl md:text-6xl mb-6 leading-tight">
                No more wondering<br/>what happens next.
              </h2>
              <p className="text-xl text-white/60">See where things stand.</p>
            </div>
            <div className="md:w-1/2 flex justify-center md:justify-end">
              <StoryProgressTracker ref={progressRef} className="bg-black/50 p-8 rounded-3xl border border-white/5 backdrop-blur-xl" />
            </div>
          </div>
        </StoryScene>

        {/* Frame 09: Resolution */}
        <StoryScene ref={scene9Ref} id="scene-09" framePath="/story/frame-09.png">
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none"></div>
          <div className="relative z-20 flex flex-col items-center justify-center h-full w-full px-4 text-center mt-[20vh]">
            <div ref={text9Ref}>
              <h2 className="story-editorial-text text-4xl md:text-7xl mb-6 text-white leading-tight">
                Your PF journey<br/>should feel this simple.
              </h2>
              <p className="text-xl text-white/70 tracking-wide uppercase text-sm">Understand. Act. Resolve.</p>
            </div>
          </div>
        </StoryScene>
      </div>

      {/* Post-story CTA that scrolls naturally into view after unpin */}
      <div className="relative w-full min-h-[50vh] flex flex-col items-center justify-center bg-black py-24 z-10 border-t border-white/5">
        <StoryCTA />
      </div>
    </div>
  );
}
