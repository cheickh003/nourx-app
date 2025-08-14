"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

export function TopProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const activeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function start() {
    activeRef.current += 1;
    setVisible(true);
    setWidth(10);
    // accelerate a bit
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setWidth(65), 120);
  }

  function done() {
    activeRef.current = Math.max(0, activeRef.current - 1);
    if (activeRef.current === 0) {
      setWidth(100);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 200);
    }
  }

  // Trigger on route changes
  useEffect(() => {
    start();
    const id = setTimeout(done, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search ? search.toString() : ""]);

  // Trigger on link clicks and form submits for extra feedback
  useEffect(() => {
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.closest("a,button") as HTMLElement | null;
      if (!tag) return;
      start();
      setTimeout(done, 1200);
    };
    const onSubmit = () => {
      start();
      // allow server action time
      setTimeout(done, 1500);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="h-full bg-primary transition-[width] duration-200 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}

export function TopProgressBarWithSuspense() {
  return (
    <Suspense>
      <TopProgressBar />
    </Suspense>
  )
}


