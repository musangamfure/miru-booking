"use client";

import { useState, useEffect } from "react";

// Detects whether to render the mobile or desktop layout. Combines
// viewport width, a matchMedia listener (for live resize/rotation),
// and a user-agent sniff so embedded webviews report correctly too.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(null);
  useEffect(() => {
    const check = () => {
      const byWidth = window.innerWidth < 900;
      const byMedia = window.matchMedia("(max-width: 899px)").matches;
      const byAgent =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobile(byWidth || byMedia || byAgent);
    };
    check();
    const mq = window.matchMedia("(max-width: 899px)");
    mq.addEventListener("change", check);
    window.addEventListener("resize", check);
    return () => {
      mq.removeEventListener("change", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return isMobile;
}
