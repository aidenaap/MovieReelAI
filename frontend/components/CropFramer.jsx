export default function CropFramer({ sourceUrl, cut, cropX, mode, onCropX, onMode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-28 shrink-0 aspect-[9/16] overflow-hidden rounded-lg bg-black border border-zinc-800">
        <video
          src={sourceUrl}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => { e.target.currentTime = cut.start + 0.5; }}
          className={mode === "blur" ? "w-full h-full object-contain" : "w-full h-full object-cover"}
          style={mode === "blur" ? {} : { objectPosition: `${cropX * 100}% center` }}
        />
      </div>
      <div className="flex-1">
        <label className="text-xs text-zinc-500">Framing (cropX: {cropX.toFixed(2)})</label>
        <input
          type="range" min="0" max="1" step="0.01"
          value={cropX}
          disabled={mode === "blur"}
          onChange={(e) => onCropX(parseFloat(e.target.value))}
          className="w-full accent-amber-400 disabled:opacity-30"
        />
        <div className="mt-2 flex gap-2 text-xs">
          {["crop", "blur"].map((m) => (
            <button key={m} onClick={() => onMode(m)}
              className={`rounded px-2 py-1 border ${mode === m ? "border-amber-400 text-amber-400" : "border-zinc-700 text-zinc-500"}`}>
              {m === "crop" ? "Crop" : "Blur fill"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}