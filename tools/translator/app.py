"""Gradio demo for the ALEF Talk translator (record or type, both directions)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import gradio as gr

from tools.translator import pipeline, spend
from tools.translator.names import holds_divine_name


def run(audio, text, direction, speak):
    try:
        audio_bytes, mime = None, ""
        if audio is not None:
            # gr.Audio type="filepath" yields a path
            path = audio if isinstance(audio, str) else None
            if path and Path(path).exists():
                audio_bytes = Path(path).read_bytes()
                mime = "audio/wav" if path.endswith(".wav") else "audio/webm"
        result = pipeline.talk(
            text=(text or "").strip() or None,
            audio=audio_bytes,
            mime=mime,
            direction=direction,
            speak=bool(speak),
        )
    except spend.SpendCapExceeded as e:
        return str(e), "", None, "held" if False else "cap"
    except pipeline.HeldNameError as e:
        return str(e), "", None, "held"
    if result.get("held"):
        return result.get("message") or "", "", None, "held"
    if not result.get("ok"):
        return result.get("error") or "Failed.", "", None, "error"
    audio_out = None
    if result.get("audio"):
        import base64, tempfile
        raw = base64.b64decode(result["audio"])
        fd, p = tempfile.mkstemp(suffix=".mp3")
        os.close(fd)
        Path(p).write_bytes(raw)
        audio_out = p
    src = result.get("source") or text or ""
    tr = result.get("translation") or ""
    note = result.get("voice_mode") or ""
    return src, tr, audio_out, note


def build():
    with gr.Blocks(title="ALEF Talk") as demo:
        gr.Markdown(
            "# ALEF Talk\n"
            "English ↔ Hebrew conversation translator. "
            "The translated line is shown large and can be spoken automatically. "
            "When Instant Custom Voice cannot keep a Hebrew voice, a close stock voice is used."
        )
        with gr.Row():
            direction = gr.Radio(
                choices=[("Auto", "auto"), ("English → Hebrew", "en-he"), ("Hebrew → English", "he-en")],
                value="auto",
                label="Direction",
            )
            speak = gr.Checkbox(value=True, label="Speak the translation")
        audio = gr.Audio(sources=["microphone", "upload"], type="filepath", label="Speak")
        text = gr.Textbox(label="Or type", lines=3)
        go = gr.Button("Translate")
        out_src = gr.Textbox(label="Recognised")
        out_tr = gr.Textbox(label="Translation")
        out_audio = gr.Audio(label="Spoken translation", type="filepath")
        out_note = gr.Textbox(label="Voice")
        go.click(run, [audio, text, direction, speak], [out_src, out_tr, out_audio, out_note])
    return demo


if __name__ == "__main__":
    port = int(os.environ.get("GRADIO_SERVER_PORT") or os.environ.get("PORT") or "7860")
    build().launch(server_name="0.0.0.0", server_port=port, share=False)
