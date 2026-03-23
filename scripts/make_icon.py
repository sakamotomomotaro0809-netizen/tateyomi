"""
tateyomi アイコン生成スクリプト
縦書き「縦」文字をベースにした .ico ファイルを生成する
"""
from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 32,48, 64, 128, 256]

def make_icon():
    frames = []
    for size in SIZES:
        img = Image.new("RGBA", (size, size), (30, 30, 50, 255))
        draw = ImageDraw.Draw(img)

        # 背景グラデーション風（角丸を模倣）
        margin = size // 8
        draw.rounded_rectangle(
            [margin, margin, size - margin, size - margin],
            radius=size // 6,
            fill=(45, 90, 160, 255),
        )

        # 「縦」の文字を描画
        font_size = int(size * 0.55)
        try:
            # Windows の游ゴシック or メイリオ
            for fname in ["yugothb.ttc", "meiryo.ttc", "YuGothB.ttc"]:
                font_path = os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts", fname)
                if os.path.exists(font_path):
                    font = ImageFont.truetype(font_path, font_size)
                    break
            else:
                font = ImageFont.load_default()
        except Exception:
            font = ImageFont.load_default()

        text = "縦"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        x = (size - tw) // 2 - bbox[0]
        y = (size - th) // 2 - bbox[1]
        draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))

        frames.append(img)

    out = "tateyomi/assets/tateyomi.ico"
    frames[0].save(out, format="ICO", sizes=[(s, s) for s in SIZES], append_images=frames[1:])
    print(f"OK {out}")

if __name__ == "__main__":
    make_icon()
