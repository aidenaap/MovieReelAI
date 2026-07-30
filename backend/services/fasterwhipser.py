import json, sys
from faster_whisper import WhisperModel

wav = sys.argv[1]
model = WhisperModel("base.en", compute_type="int8")
segments, info = model.transcribe(wav, word_timestamps=True)

words, segs = [], []
for seg in segments:
    segs.append({"start": round(seg.start, 3), "end": round(seg.end, 3), "text": seg.text.strip()})
    for w in seg.words or []:
        words.append({
            "i": len(words),
            "text": w.word.strip(),
            "start": round(w.start, 3),
            "end": round(w.end, 3),
        })

print(json.dumps({"language": info.language, "words": words, "segments": segs}))