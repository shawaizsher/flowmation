from __future__ import annotations

from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont

WIDTH = 960
HEIGHT = 540
TOTAL_FRAMES = 72
DURATION_MS = 45

BG_TOP = (248, 250, 252)
BG_BOTTOM = (241, 245, 249)
SURFACE = (255, 255, 255)
BORDER = (226, 232, 240)
TEXT_PRIMARY = (15, 23, 42)
TEXT_MUTED = (100, 116, 139)
BRAND = (246, 48, 73)
ACCENT = (6, 182, 212)
SUCCESS = (16, 185, 129)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_names = [
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
        "arialbd.ttf" if bold else "arial.ttf",
        "segoeuib.ttf" if bold else "segoeui.ttf",
    ]
    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT_TITLE = load_font(24, bold=True)
FONT_BODY = load_font(16)
FONT_CAPTION = load_font(14)
FONT_NODE = load_font(15, bold=True)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def ease_out_cubic(t: float) -> float:
    return 1 - pow(1 - t, 3)


def point_on_curve(t: float, p0: tuple[float, float], p1: tuple[float, float], p2: tuple[float, float]) -> tuple[float, float]:
    u = 1 - t
    x = (u * u * p0[0]) + (2 * u * t * p1[0]) + (t * t * p2[0])
    y = (u * u * p0[1]) + (2 * u * t * p1[1]) + (t * t * p2[1])
    return x, y


def draw_vertical_gradient(draw: ImageDraw.ImageDraw) -> None:
    for y in range(HEIGHT):
        ratio = y / max(1, HEIGHT - 1)
        r = int(lerp(BG_TOP[0], BG_BOTTOM[0], ratio))
        g = int(lerp(BG_TOP[1], BG_BOTTOM[1], ratio))
        b = int(lerp(BG_TOP[2], BG_BOTTOM[2], ratio))
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))


def draw_panel(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, title: str) -> None:
    draw.rounded_rectangle((x, y, x + w, y + h), radius=18, fill=SURFACE, outline=BORDER, width=2)
    draw.rectangle((x, y + 52, x + w, y + 54), fill=BORDER)
    draw.text((x + 20, y + 16), title, fill=TEXT_PRIMARY, font=FONT_TITLE)


def draw_node_card(draw: ImageDraw.ImageDraw, x: float, y: float, w: int, h: int, title: str, subtitle: str, color: tuple[int, int, int]) -> None:
    draw.rounded_rectangle((x, y, x + w, y + h), radius=14, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
    draw.rounded_rectangle((x + 10, y + 10, x + 34, y + 34), radius=7, fill=color)
    draw.text((x + 44, y + 10), title, fill=TEXT_PRIMARY, font=FONT_NODE)
    draw.text((x + 44, y + 35), subtitle, fill=TEXT_MUTED, font=FONT_CAPTION)


def draw_cursor(draw: ImageDraw.ImageDraw, x: float, y: float, click: bool) -> None:
    pointer = [(x, y), (x + 14, y + 36), (x + 22, y + 24), (x + 34, y + 44), (x + 42, y + 39), (x + 30, y + 20), (x + 46, y + 20)]
    draw.polygon(pointer, fill=(255, 255, 255), outline=(30, 41, 59))
    if click:
        draw.ellipse((x + 8, y + 8, x + 58, y + 58), outline=(246, 48, 73), width=2)


def main() -> None:
    output_path = Path(__file__).resolve().parents[1] / "public" / "flowa-drag-drop-demo.gif"

    left_panel = (30, 40, 250, 460)
    canvas_panel = (300, 40, 630, 460)

    start_card = (55, 170)
    end_card = (410, 220)
    card_w, card_h = 220, 78

    fixed_card_pos = (660, 230)

    frames: list[Image.Image] = []

    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / max(1, TOTAL_FRAMES - 1)

        drag_start = 0.08
        drag_end = 0.58
        if t < drag_start:
            drag_t = 0.0
        elif t > drag_end:
            drag_t = 1.0
        else:
            drag_t = (t - drag_start) / (drag_end - drag_start)
        drag_t = ease_out_cubic(drag_t)

        connect_start = 0.62
        connect_end = 0.9
        if t < connect_start:
            connect_t = 0.0
        elif t > connect_end:
            connect_t = 1.0
        else:
            connect_t = (t - connect_start) / (connect_end - connect_start)

        click = 0.12 <= t <= 0.18

        img = Image.new("RGBA", (WIDTH, HEIGHT), BG_TOP)
        draw = ImageDraw.Draw(img)

        draw_vertical_gradient(draw)

        draw_panel(draw, *left_panel, title="Nodes")
        draw_panel(draw, *canvas_panel, title="Workflow Canvas")

        draw.text((55, 110), "Drag from left panel", fill=TEXT_MUTED, font=FONT_BODY)
        draw.text((325, 110), "Drop inside canvas", fill=TEXT_MUTED, font=FONT_BODY)

        draw_node_card(draw, 55, 170, card_w, card_h, "Email Sender", "Action node", (249, 115, 22))
        draw_node_card(draw, 55, 268, card_w, card_h, "Webhook Trigger", "Start node", (14, 165, 233))

        draw_node_card(draw, fixed_card_pos[0], fixed_card_pos[1], card_w, card_h, "CRM Update", "Action node", (16, 185, 129))

        if t <= drag_end:
            drag_x = lerp(start_card[0], end_card[0], drag_t)
            drag_y = lerp(start_card[1], end_card[1], drag_t) - math.sin(drag_t * math.pi) * 18
        else:
            drag_x = end_card[0]
            drag_y = end_card[1]

        shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.rounded_rectangle(
            (drag_x + 4, drag_y + 8, drag_x + card_w + 4, drag_y + card_h + 8),
            radius=14,
            fill=(15, 23, 42, 40),
        )
        img = Image.alpha_composite(img, shadow)
        draw = ImageDraw.Draw(img)

        draw_node_card(draw, drag_x, drag_y, card_w, card_h, "Email Sender", "Action node", (249, 115, 22))

        cursor_x = drag_x - 18
        cursor_y = drag_y - 14
        draw_cursor(draw, cursor_x, cursor_y, click=click)

        drop_hint_alpha = int(110 + 70 * (1 - drag_t))
        draw.rounded_rectangle(
            (390, 200, 670, 340),
            radius=16,
            outline=(246, 48, 73, drop_hint_alpha),
            width=2,
        )

        if connect_t > 0:
            p0 = (drag_x + card_w, drag_y + card_h / 2)
            p1 = ((drag_x + card_w + fixed_card_pos[0]) / 2, drag_y + card_h / 2 - 45)
            p2 = (fixed_card_pos[0], fixed_card_pos[1] + card_h / 2)

            path_points = []
            segments = max(4, int(40 * connect_t))
            for idx in range(segments + 1):
                local_t = idx / max(1, segments)
                if local_t > connect_t:
                    break
                path_points.append(point_on_curve(local_t, p0, p1, p2))

            if len(path_points) >= 2:
                draw.line(path_points, fill=BRAND, width=5)

        if connect_t >= 1:
            draw.ellipse((fixed_card_pos[0] - 6, fixed_card_pos[1] + card_h / 2 - 6, fixed_card_pos[0] + 6, fixed_card_pos[1] + card_h / 2 + 6), fill=BRAND)
            draw.ellipse((drag_x + card_w - 6, drag_y + card_h / 2 - 6, drag_x + card_w + 6, drag_y + card_h / 2 + 6), fill=BRAND)

            success_pill_w = 188
            success_x = 378
            success_y = 365
            draw.rounded_rectangle(
                (success_x, success_y, success_x + success_pill_w, success_y + 36),
                radius=18,
                fill=(236, 253, 245),
                outline=(167, 243, 208),
                width=2,
            )
            draw.ellipse((success_x + 10, success_y + 10, success_x + 24, success_y + 24), fill=SUCCESS)
            draw.text((success_x + 34, success_y + 9), "Node connected", fill=(5, 150, 105), font=FONT_CAPTION)

        draw.text((36, 510), "Flowa Drag & Drop Builder", fill=TEXT_MUTED, font=FONT_CAPTION)
        draw.text((810, 510), "Loop demo", fill=TEXT_MUTED, font=FONT_CAPTION)

        frames.append(img.convert("P", palette=Image.Palette.ADAPTIVE))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=DURATION_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )

    print(f"GIF generated at: {output_path}")


if __name__ == "__main__":
    main()
