#!/usr/bin/env python3
"""Optional Gradio demo of the camera translator, for trying photos by hand on your own computer.

  pip install gradio            (plus requirements.txt)
  python3 demo.py               then open the printed local address

Uses the same engines as the service (see camera_translate/app.py: CAMERA_OCR, CAMERA_TRANSLATE, GOOGLE_APPLICATION_CREDENTIALS).
Binds to 127.0.0.1 only, keeps no uploads (Gradio's own cache is switched off for inputs and outputs).
"""
from __future__ import annotations

import io

from PIL import Image

from camera_translate.app import build_engines
from camera_translate.intake import IntakeError, encode_png
from camera_translate.pipeline import translate_photo


def main():
    import gradio as gr

    ocr, fallback, translator, glossary = build_engines()

    def run(image: Image.Image | None):
        if image is None:
            return None, []
        try:
            res = translate_photo(encode_png(image), ocr, translator, glossary, fallback)
        except IntakeError as exc:
            raise gr.Error(str(exc))
        rows = [['(sacred text)' if r['held'] else r['he'], r['en'] or '', r['translit'] or '', r['translationSource'] or ''] for r in res['regions']]
        return Image.open(io.BytesIO(res['image_jpeg'])), rows

    with gr.Blocks(title='Camera Translator') as demo:
        gr.Markdown(f'# Camera Translator\nReader: **{ocr.name}**. Translator: **{translator.name}**.')
        with gr.Row():
            src = gr.Image(type='pil', label='Photo Of A Hebrew Sign', sources=['upload', 'webcam'])
            out = gr.Image(type='pil', label='English On The Photo', interactive=False)
        table = gr.Dataframe(headers=['Hebrew', 'English', 'Sounds Like', 'Source'], interactive=False)
        gr.Button('Translate').click(run, src, [out, table], api_name=False)
    demo.launch(server_name='127.0.0.1', show_api=False)


if __name__ == '__main__':
    main()
