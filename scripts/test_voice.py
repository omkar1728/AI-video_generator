import sys
import soundfile as sf
from kokoro_onnx import Kokoro

MODEL = "models/kokoro-v1.0.int8.onnx"
kokoro = Kokoro(MODEL, "models/voices-v1.0.bin")
if "--list" in sys.argv:
    print(sorted(kokoro.get_voices()))
    sys.exit()
voice = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
text = "Llama Index connects language models to your own data."
samples, sr = kokoro.create(text, voice=voice, speed=1.0, lang="en-us")
sf.write("test.wav", samples, sr)
print("Wrote test.wav, seconds:", round(len(samples) / sr, 2))
