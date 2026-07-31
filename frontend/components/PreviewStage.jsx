import { useRef } from "react";
import { cropAt } from "../api/crop.js";

export default function PreviewStage({ videoRef, src, mode, shots, t, initialTime, editable, onDragX }) {
  const drag = useRef(null);
  const x = cropAt(shots, t);
  const crop = editable && mode === "crop";

  const down = (e) => {
    if (!crop) return;
    e.preventDefault();
    drag.current = { x0: e.clientX, sx: x, w: e.currentTarget.clientWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    onDragX(Math.min(1, Math.max(0, d.sx - (e.clientX - d.x0) / (d.w * 1.5))));
  };
  const up = () => (drag.current = null);

  return (
    <div
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      title={crop ? "Drag horizontally to reframe this shot" : ""}
      className={`relative h-full aspect-[9/16] rounded-lg overflow-hidden bg-black ring-1 ring-zinc-800 shadow-2xl shadow-black/60 ${
        crop ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <video
        ref={videoRef} src={src} playsInline preload="auto"
        onLoadedMetadata={(e) => { e.target.currentTime = initialTime; }}
        className={crop ? "w-full h-full object-cover" : "w-full h-full object-contain"}
        style={crop ? { objectPosition: `${x * 100}% center` } : {}}
      />
      {crop && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/10" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/10" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/10" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/10" />
        </div>
      )}
    </div>
  );
}