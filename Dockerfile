# ============================================================
# tateyomi — Docker イメージ
# CLI のみ (GUIなし)。WeasyPrint/GTK もインストール済み。
# ビルド:
#   docker build -t tateyomi .
# 使い方:
#   docker run --rm -v "$(pwd):/work" tateyomi convert /work/input.epub /work/output.epub
# ============================================================

FROM python:3.11-slim

# WeasyPrint 依存 (GTK/Pango/Cairo)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    libcairo2 \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml ./
COPY tateyomi/ ./tateyomi/

RUN pip install --no-cache-dir -e "."

# デフォルト作業ディレクトリ（マウント先）
WORKDIR /work

ENTRYPOINT ["python", "-m", "tateyomi.cli"]
CMD ["--help"]
