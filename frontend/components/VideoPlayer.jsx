import { useEffect, useRef } from "react";

export default function VideoPlayer({ src, onTime, className }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const loop = () => {
      const v = ref.current;
      if (v && !v.paused && !v.ended) onTime?.(v.currentTime);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onTime]);
  return <video ref={ref} src={src} controls playsInline className={className} />;
}