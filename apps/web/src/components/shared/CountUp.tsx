"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
}

export function CountUp({ end, duration = 1.5, className }: CountUpProps) {
  // Start at the final value. Seeding this with 0 meant the server, and every
  // client without JS, rendered a literal "0" where a real score belongs —
  // worse than a missing animation, because the number reads as data. The
  // count-up is a post-hydration enhancement layered on top of the real value.
  const [count, setCount] = useState(end);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let armed = false;
    let started = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // The observer reports current state on its first callback. If the
        // number is already on screen when we hydrate, animating would mean
        // resetting a value the reader can see back to zero, so leave it be and
        // only animate numbers that are scrolled to.
        if (!armed) {
          armed = true;
          if (entry.isIntersecting) observer.disconnect();
          return;
        }

        if (!entry.isIntersecting || started) return;
        started = true;
        observer.disconnect();

        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / 1000 / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) frame = requestAnimationFrame(step);
        };

        setCount(0);
        frame = requestAnimationFrame(step);
      },
      // Trigger just below the fold so the reset to zero happens off screen.
      { threshold: 0, rootMargin: "0px 0px 10% 0px" }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [end, duration]);

  return (
    <span ref={ref} className={className}>
      {count}
    </span>
  );
}
