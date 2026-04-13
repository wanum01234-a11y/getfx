import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "fxpro-splash-shown";

type SplashScreenProps = {
  durationMs?: number;
};

export function SplashScreen({ durationMs = 5000 }: SplashScreenProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "true";
    if (alreadyShown) return;

    setShouldRender(true);
    const raf = window.requestAnimationFrame(() => setIsVisible(true));

    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      unmountTimerRef.current = window.setTimeout(() => {
        window.sessionStorage.setItem(SESSION_KEY, "true");
        setShouldRender(false);
      }, 520);
    }, durationMs);

    return () => {
      window.cancelAnimationFrame(raf);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      if (unmountTimerRef.current) window.clearTimeout(unmountTimerRef.current);
    };
  }, [durationMs]);

  if (!shouldRender) return null;

  return (
    <div
      className={
        "fixed top-0 left-0 w-screen h-screen z-[9999] overflow-hidden transition-opacity duration-500 " +
        (isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
      }
      style={{ WebkitTapHighlightColor: "transparent" }}
      aria-hidden
    >
      <div className="absolute inset-0 fxpro-splash-base" />
      <div className="absolute inset-0 fxpro-splash-grid" />
      <div className="absolute inset-0 fxpro-splash-candles" />
      <div className="absolute inset-0 fxpro-splash-lines" />
      <div className="absolute inset-0 fxpro-splash-particles" />
      <div className="absolute inset-0 fxpro-splash-sweep" />
      <div className="absolute inset-0 fxpro-splash-vignette" />

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
        <div
          className={
            "fxpro-splash-title text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight " +
            (isVisible ? "opacity-100 scale-100" : "opacity-0 scale-[0.985]")
          }
        >
          <span className="fxpro-splash-title-back" aria-hidden>
            fxpro.space
          </span>
          <span className="fxpro-splash-title-front">fxpro.space</span>
        </div>

        <div
          className={
            "mt-3 text-xs sm:text-sm tracking-wide text-white/70 transition-all duration-700 " +
            (isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")
          }
          style={{ transitionDelay: "220ms" }}
        >
          Developed by Usman Hameed
        </div>

        <div className="absolute bottom-7 right-7 sm:bottom-9 sm:right-9 z-10 fxpro-splash-whatsapp" aria-hidden>
          <div className="fxpro-splash-whatsapp-bubble">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12.1 21.1c-1.6 0-3.2-.4-4.6-1.2l-4 1.1 1.1-3.9c-.9-1.5-1.4-3.2-1.4-4.9C3.2 7.3 7.2 3.3 12.2 3.3c5 0 9 4 9 8.9 0 4.9-4 8.9-9.1 8.9Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9.2 9.1c.2-.6.4-.6.7-.6h.6c.2 0 .4.1.5.4l.7 1.6c.1.2.1.5 0 .7l-.4.6c-.1.2-.1.4 0 .6.5.8 1.2 1.5 2 2 .2.1.4.1.6 0l.6-.4c.2-.1.5-.1.7 0l1.6.7c.3.1.4.3.4.5v.6c0 .3 0 .5-.6.7-.5.2-1.6.5-3.6-.3-2.2-.9-4-3.6-4.4-4.4-.8-2 .5-3.1.7-3.7Z"
                fill="currentColor"
                opacity="0.9"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
