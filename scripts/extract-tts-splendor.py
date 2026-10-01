"""Extract Splendor images from a TTS save and its existing local image cache.

Requires Python 3 and Pillow. Does not execute mod scripts or fetch remote URLs.
Outputs are local artifacts, not a published platform asset pack.
"""

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def cached_image(cache, url):
    # TTS also rewrites older Steam cloud hosts to steamusercontent-a.akamaihd.net.
    stem = re.sub(r"[^a-zA-Z0-9]", "", url)
    candidates = list(cache.glob(stem + ".*"))
    if not candidates and "/ugc/" in url:
        suffix = re.sub(r"[^a-zA-Z0-9]", "", url.split("/ugc/", 1)[1])
        candidates = [p for p in cache.iterdir() if suffix in p.stem]
    if not candidates:
        raise FileNotFoundError(f"Image missing from local TTS cache: {url}")
    path = sorted(candidates)[0]
    with Image.open(path) as image:
        image.verify()
    return path


def contact_sheet(items, destination, columns=10, width=140, height=220):
    rows = (len(items) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * width, rows * height), "#20232a")
    draw = ImageDraw.Draw(sheet)
    for index, (label, path) in enumerate(items):
        x = index % columns * width
        y = index // columns * height
        with Image.open(path) as original:
            thumb = original.convert("RGB")
            thumb.thumbnail((width - 12, height - 30))
        sheet.paste(thumb, (x + (width - thumb.width) // 2, y + 4))
        draw.text((x + 6, y + height - 20), label, fill="white")
    sheet.save(destination)


def extract(save, cache, output):
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing extraction: {output}")
    data = json.loads(save.read_text(encoding="utf-8-sig"))
    objects = list(walk(data.get("ObjectStates", [])))
    decks = [obj for obj in data["ObjectStates"] if obj.get("Name") == "DeckCustom"]
    counts = sorted(len(obj.get("DeckIDs", [])) for obj in decks)
    if counts != [20, 30, 40]:
        raise ValueError(f"Expected base-game decks of 40/30/20 cards, found {counts}")
    nobles = [obj for obj in objects if obj.get("Name") == "Custom_Tile"
              and obj.get("Nickname") == "Noble"]
    tokens = [obj for obj in data["ObjectStates"] if obj.get("Name") == "Custom_Model_Bag"]
    token_colors = {"Diamond": "white", "Sapphire": "blue", "Emerald": "green",
                    "Ruby": "red", "Onyx": "black", "Gold": "gold"}
    if len(nobles) != 10 or sorted(obj.get("Nickname") for obj in tokens) != sorted(token_colors):
        raise ValueError("Expected ten nobles and six named token textures")

    sources = {}
    for obj in objects:
        for deck in obj.get("CustomDeck", {}).values():
            for field in ["FaceURL", "BackURL"]:
                sources[deck[field]] = cached_image(cache, deck[field])
        custom = obj.get("CustomImage", {})
        for field in ["ImageURL", "ImageSecondaryURL"]:
            if custom.get(field):
                sources[custom[field]] = cached_image(cache, custom[field])
        mesh = obj.get("CustomMesh", {})
        if mesh.get("DiffuseURL"):
            sources[mesh["DiffuseURL"]] = cached_image(cache, mesh["DiffuseURL"])

    output.mkdir(parents=True)
    manifest = {"format": "tts-splendor-extraction-v1", "saveName": data.get("SaveName"),
                "saveSha256": hashlib.sha256(save.read_bytes()).hexdigest(),
                "cards": [], "nobles": [], "tokens": [], "backs": [], "sources": []}

    def copy_source(url, relative):
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(sources[url], target)
        with Image.open(target) as image:
            size = list(image.size)
        entry = {"file": relative, "url": url, "size": size,
                 "sha256": hashlib.sha256(target.read_bytes()).hexdigest()}
        return entry

    for index, (url, path) in enumerate(sorted(sources.items())):
        manifest["sources"].append(copy_source(url, f"originals/{index + 1:02d}{path.suffix}"))

    card_previews = []
    for obj in sorted(decks, key=lambda obj: -len(obj["DeckIDs"])):
        tier = {40: 1, 30: 2, 20: 3}[len(obj["DeckIDs"])]
        for card_id in sorted(obj["DeckIDs"]):
            deck_id, cell = divmod(card_id, 100)
            deck = obj["CustomDeck"][str(deck_id)]
            cols, rows = deck["NumWidth"], deck["NumHeight"]
            if not 0 <= cell < cols * rows - 1:
                raise ValueError(f"Invalid or reserved TTS card cell: {card_id}")
            with Image.open(sources[deck["FaceURL"]]) as atlas:
                column, row = cell % cols, cell // cols
                box = (round(column * atlas.width / cols), round(row * atlas.height / rows),
                       round((column + 1) * atlas.width / cols), round((row + 1) * atlas.height / rows))
                relative = f"cards/tier-{tier}/tts-{card_id}.png"
                target = output / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                atlas.crop(box).save(target)
            manifest["cards"].append({"tier": tier, "ttsCardId": card_id,
                                      "cell": cell, "grid": [cols, rows], "crop": list(box),
                                      "file": relative, "faceUrl": deck["FaceURL"]})
            card_previews.append((str(card_id), target))
        deck = next(iter(obj["CustomDeck"].values()))
        entry = copy_source(deck["BackURL"], f"backs/tier-{tier}{sources[deck['BackURL']].suffix}")
        manifest["backs"].append({"tier": tier, **entry})

    noble_previews = []
    for obj in sorted(nobles, key=lambda obj: obj["GUID"]):
        url = obj["CustomImage"]["ImageURL"]
        entry = copy_source(url, f"nobles/tts-{obj['GUID']}{sources[url].suffix}")
        manifest["nobles"].append({"ttsGuid": obj["GUID"], **entry})
        noble_previews.append((obj["GUID"], output / entry["file"]))
    url = nobles[0]["CustomImage"]["ImageSecondaryURL"]
    manifest["backs"].append({"kind": "noble", **copy_source(url, f"backs/noble{sources[url].suffix}")})
    for obj in tokens:
        url = obj["CustomMesh"]["DiffuseURL"]
        color = token_colors[obj["Nickname"]]
        manifest["tokens"].append({"color": color, "kind": "mesh-uv-texture",
                                   **copy_source(url, f"tokens/{color}-texture{sources[url].suffix}")})

    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    contact_sheet(card_previews, output / "cards-preview.jpg")
    contact_sheet(noble_previews, output / "nobles-preview.jpg", columns=5, width=200, height=230)
    (output / "README.txt").write_text(
        "Splendor TTS mod image extraction\n"
        "90 development cards: 40 tier 1, 30 tier 2, 20 tier 3.\n"
        "10 nobles, 3 card backs, 1 noble back, 6 token UV textures.\n"
        "originals/ preserves the source images; manifest.json records URLs and crop coordinates.\n"
        "Card names use TTS CardID; noble names use TTS GUID. These are NOT platform game IDs.\n"
        "Token images are original 3D mesh UV textures, not ready-to-use flat token icons.\n"
        "Source: user-supplied Workshop save 2023213924 and existing local TTS cache.\n"
        "The mod does not establish publisher authorization. No platform pack was published.\n",
        encoding="utf-8")
    print(json.dumps({key: len(manifest[key]) for key in ["cards", "nobles", "tokens", "backs", "sources"]}))
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("save", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--cache", type=Path)
    args = parser.parse_args()
    cache = args.cache or args.save.parent.parent / "Images"
    result = extract(args.save, cache, args.output)
    archive = shutil.make_archive(str(result), "zip", root_dir=result)
    print(f"Extracted to {result}\nArchive: {archive}")


if __name__ == "__main__":
    main()
