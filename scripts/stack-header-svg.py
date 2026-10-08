"""Builds public/header-stacked.svg: the hero calligraphy broken onto two lines for narrow screens.

Each glyph in header.svg is its own <g filter=...> group, so a line break is just a
translate on the groups that belong to the second line. Rerun after editing header.svg:

    python3 scripts/stack-header-svg.py
"""
import re
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "public"
SPLIT_X = 484        # gap between "forged" and "with" in header.svg units
LINE_GAP = 112       # vertical offset of the second line; ~107 is the least that keeps loops from touching
PAD = 8

NUMBER = re.compile(r"-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?")
COMMAND = re.compile(r"[MLCHVZ]|" + NUMBER.pattern)
ARITY = {"M": 2, "L": 2, "C": 6, "H": 1, "V": 1, "Z": 0}


def x_extent(d: str) -> tuple[float, float]:
    """x-range of an absolute-command path."""
    xs, cmd, tokens, i = [], None, COMMAND.findall(d), 0
    while i < len(tokens):
        if tokens[i] in ARITY:
            cmd = tokens[i]
            i += 1
            if cmd == "Z":
                continue
        n = ARITY[cmd]
        args = [float(t) for t in tokens[i:i + n]]
        i += n
        if cmd == "H":
            xs.append(args[0])
        elif cmd != "V":
            xs.extend(args[0::2])
    return min(xs), max(xs)


def main() -> None:
    src = (PUBLIC / "header.svg").read_text()
    height = float(re.search(r'viewBox="0 0 [\d.]+ ([\d.]+)"', src).group(1))
    groups = list(re.finditer(r'<g filter="[^"]+">.*?</g>', src, re.S))

    lines: list[list[tuple[str, float, float]]] = [[], []]
    for m in groups:
        lo, hi = x_extent(re.search(r'<path d="([^"]+)"', m.group(0)).group(1))
        lines[0 if (lo + hi) / 2 < SPLIT_X else 1].append((m.group(0), lo, hi))

    extents = [(min(g[1] for g in line), max(g[2] for g in line)) for line in lines]
    width = max(hi - lo for lo, hi in extents) + 2 * PAD

    # The hero animates the last path first, so emit the second line first to keep left-to-right writing
    body = []
    for row, (line, (lo, hi)) in reversed(list(enumerate(zip(lines, extents)))):
        dx = (width - (hi - lo)) / 2 - lo
        dy = row * LINE_GAP
        for markup, _, _ in line:
            body.append(markup.replace("<g ", f'<g transform="translate({dx:.2f} {dy})" ', 1))

    first, last = groups[0].start(), groups[-1].end()
    out = (
        src[:first]
        + "\n".join(body)
        + src[last:]
    )
    new_height = height + LINE_GAP
    out = re.sub(
        r'<svg width="[\d.]+" height="[\d.]+" viewBox="[^"]+"',
        f'<svg width="{width:.0f}" height="{new_height:.0f}" viewBox="0 0 {width:.0f} {new_height:.0f}"',
        out,
        count=1,
    )
    (PUBLIC / "header-stacked.svg").write_text(out)
    print(f"wrote header-stacked.svg ({width:.0f}x{new_height:.0f})")


if __name__ == "__main__":
    main()
