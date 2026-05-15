import "../styles/globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Lenis from "lenis";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      if (lenis) lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const handleStart = () => setIsTransitioning(true);
    const handleComplete = () => setTimeout(() => setIsTransitioning(false), 220);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router.events]);

  return (
    <>
      <div
        className={`transition-overlay ${isTransitioning ? "visible" : ""}`}
        aria-hidden="true"
      />
      <div className={`page-wrapper ${isTransitioning ? "is-transitioning" : ""}`}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
