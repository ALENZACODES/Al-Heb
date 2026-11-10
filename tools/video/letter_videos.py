#!/usr/bin/env python3
"""Letter videos: each Hebrew letter drawn stroke by stroke, then its name and sound shown and spoken.

    node tools/serve.mjs                          (in one window: serves the repo at http://localhost:8080)
    python3 tools/video/letter_videos.py          (all 27 letters, Ari's voice)
    python3 tools/video/letter_videos.py --voice f bet shin

Needs Python Playwright with Chromium (pip install playwright; python -m playwright install chromium) and ffmpeg.
Draws tools/video/letter-video.html frame by frame (24 fps, 720x720) from data/letters/letters.json, mixes the recorded
letter-name and letter-sound clips from audio/<voice>/israeli/letter/, and writes assets/videos/letters/<voice>/<id>.mp4
plus a poster <id>.jpg. Writes data/videos/letters.json, the list the app reads.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FPS = 24
# Final letters share the sound of their base letter; Kaf, Pe and their finals are listed by the sound they make at the end.
SOUND_CLIP = {'kaf-final': 'khaf-sound', 'mem-final': 'mem-sound', 'nun-final': 'nun-sound', 'pe-final': 'fe-sound', 'tsadi-final': 'tsadi-sound'}


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(path)], capture_output=True, text=True)
    return float(out.stdout.strip() or 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ids', nargs='*')
    ap.add_argument('--voice', default='m', choices=['m', 'f'])
    ap.add_argument('--base', default='http://localhost:8080')
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright

    letters = json.loads((ROOT / 'data/letters/letters.json').read_text())
    if a.ids:
        letters = [l for l in letters if l['id'] in a.ids]
    out_dir = ROOT / 'assets/videos/letters' / a.voice
    out_dir.mkdir(parents=True, exist_ok=True)
    clips = ROOT / 'audio' / a.voice / 'israeli' / 'letter'
    chrome = os.environ.get('CHROME') or shutil.which('google-chrome') or None
    made = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome, args=['--no-sandbox']) if chrome else p.chromium.launch()
        page = b.new_page(viewport={'width': 720, 'height': 720})
        for l in letters:
            name_clip = clips / f"{l['id']}.mp3"
            sound_clip = clips / f"{SOUND_CLIP.get(l['id'], l['id'] + '-sound')}.mp3"
            if not name_clip.exists():
                print('skip (no name recording):', l['id']); continue
            nd = duration(name_clip)
            sd = duration(sound_clip) if sound_clip.exists() else 0
            n = len(l['print']['strokes'])
            t = {'drawStart': 0.6}
            t['drawEnd'] = t['drawStart'] + min(3.3, 1.1 * n)
            t['nameAt'] = t['drawEnd'] + 0.3
            t['soundAt'] = t['nameAt'] + nd + 0.5
            end = max(6.5, (t['soundAt'] + sd if sd else t['nameAt'] + nd) + 1.4)
            page.goto(f"{a.base}/tools/video/letter-video.html", wait_until='networkidle')
            page.evaluate('([l,t,r]) => setup(l,t,r)', [{'name': l['name'], 'nameHe': l['nameHe'], 'sound': l['sound']['en'], 'strokes': l['print']['strokes']}, t, f"{a.base}/assets/img/gen/MASCOT_rimon.800.webp"])
            page.wait_for_timeout(300)
            with tempfile.TemporaryDirectory() as tmp:
                frames = int(end * FPS)
                for i in range(frames):
                    page.evaluate('(x) => render(x)', i / FPS)
                    page.screenshot(path=f'{tmp}/{i:04d}.jpg', type='jpeg', quality=88)
                mp4 = out_dir / f"{l['id']}.mp4"
                audio_in, mix = ['-i', str(name_clip)], f"[1:a]adelay={int(t['nameAt']*1000)}|{int(t['nameAt']*1000)}[a1]"
                labels = '[a1]'
                if sd:
                    audio_in += ['-i', str(sound_clip)]
                    mix += f";[2:a]adelay={int(t['soundAt']*1000)}|{int(t['soundAt']*1000)}[a2]"
                    labels += '[a2]'
                mix += f";{labels}amix=inputs={labels.count('[')}:normalize=0,apad[aout]"
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{tmp}/%04d.jpg', *audio_in,
                                '-filter_complex', mix, '-map', '0:v', '-map', '[aout]', '-shortest',
                                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p',
                                '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', str(mp4)], check=True)
                shutil.copy(f"{tmp}/{min(frames - 1, int((t['soundAt'] + 0.4) * FPS)):04d}.jpg", out_dir / f"{l['id']}.jpg")
            made.append({'id': l['id'], 'name': l['name'], 'nameHe': l['nameHe'], 'he': l['he'], 'voice': a.voice, 'seconds': round(end, 1),
                         'src': f"assets/videos/letters/{a.voice}/{l['id']}.mp4", 'poster': f"assets/videos/letters/{a.voice}/{l['id']}.jpg"})
            print(f"{l['id']}: {round(end,1)}s, {mp4.stat().st_size // 1024} KB")
        b.close()
    idx = ROOT / 'data/videos/letters.json'
    idx.parent.mkdir(parents=True, exist_ok=True)
    old = json.loads(idx.read_text())['videos'] if idx.exists() else []
    keep = [v for v in old if (v['id'], v['voice']) not in {(m['id'], m['voice']) for m in made}]
    order = {l['id']: i for i, l in enumerate(json.loads((ROOT / 'data/letters/letters.json').read_text()))}
    allv = sorted(keep + made, key=lambda v: (v['voice'], order.get(v['id'], 99)))
    idx.write_text(json.dumps({'schema': 'alef-letter-videos/1', 'note': 'Made by tools/video/letter_videos.py from the letter strokes and the recorded letter clips.', 'videos': allv}, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    sys.exit(main())
