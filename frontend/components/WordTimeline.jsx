import { useRef } from "react";

export default function WordTimeline({ words, startIdx, endIdx, activeIdx, onRangeChange }) {
  const dragging = useRef(null);

  const onMove = (e) => {
    if (!dragging.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.("[data-idx]");
    if (!el) return;
    const idx = parseInt(el.dataset.idx, 10);
    if (dragging.current === "start" && idx < endIdx) onRangeChange(idx, endIdx);
    if (dragging.current === "end" && idx > startIdx) onRangeChange(startIdx, idx);
  };
  const stop = () => {
    dragging.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", stop);
  };
  const grab = (which) => (e) => {
    e.preventDefault();
    dragging.current = which;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
  };

  const Handle = ({ which }) => (
    <span
      onPointerDown={grab(which)}
      title={`Drag to move ${which} point`}
      className="inline-block w-1.5 h-5 mx-1 align-middle bg-amber-400 rounded cursor-ew-resize"
    />
  );

  return (
    <div className="leading-8 text-sm select-none max-h-48 overflow-y-auto rounded-lg bg-zinc-950/60 p-3">
      {words.map((w) => {
        const inRange = w.i >= startIdx && w.i <= endIdx;
        const active = w.i === activeIdx;
        return (
          <span key={w.i}>
            {w.i === startIdx && <Handle which="start" />}
            <span
              data-idx={w.i}
              className={[
                "px-0.5 rounded",
                active ? "bg-emerald-500 text-zinc-950"
                  : inRange ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-600"
              ].join(" ")}
            >
              {w.text}
            </span>
            {w.i === endIdx && <Handle which="end" />}{" "}
          </span>
        );
      })}
    </div>
  );
}