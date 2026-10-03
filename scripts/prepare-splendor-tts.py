"""Prepare extracted TTS images for the platform image slots (Python + Pillow)."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError('Output already exists; use a new directory')
    manifest = json.loads((args.source / 'manifest.json').read_text(encoding='utf-8'))
    if [sum(card['tier'] == tier for card in manifest['cards']) for tier in [1, 2, 3]] != [40, 30, 20]:
        raise ValueError('Expected the extracted base-game decks')
    args.output.mkdir(parents=True)
    files = {}

    def save_image(name, source, token=False):
        with Image.open(args.source / source) as original:
            image = original.convert('RGBA')
            if token:
                # First face in this mod's 1024-square UV layout; undo its vertical stretch.
                if image.size != (1024, 1024):
                    raise ValueError('Unexpected token UV layout')
                image = image.crop((80, 128, 415, 915)).resize((384, 384), Image.LANCZOS)
                mask = Image.new('L', image.size)
                ImageDraw.Draw(mask).ellipse((0, 0, 383, 383), fill=255)
                image.putalpha(mask)
            else:
                # Full faces remain comfortably above desktop/mobile render sizes.
                image.thumbnail((400, 560), Image.LANCZOS)
            target = args.output / (name + '.png')
            image.save(target)
        files[name] = {'file': target.name, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}

    for card in manifest['cards']:
        save_image('tts-' + str(card['ttsCardId']), card['file'])
    for noble in manifest['nobles']:
        save_image('noble-' + noble['ttsGuid'], noble['file'])
    for back in manifest['backs']:
        if 'tier' in back:
            save_image('back-' + str(back['tier']), back['file'])
    for token in manifest['tokens']:
        save_image('token-' + token['color'], token['file'], token=True)
    (args.output / 'files.json').write_text(json.dumps(files, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(files)} PNG files in {args.output}')


if __name__ == '__main__':
    main()
