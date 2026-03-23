"""
tateyomi Web アプリケーション
FastAPI + Google OAuth2 + SQLite
"""
from __future__ import annotations
import os
import tempfile
import asyncio
from pathlib import Path
from functools import partial

from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from tateyomi.web.db import init_db, upsert_user, get_user, \
    create_conversion, update_conversion, get_user_conversions, get_conversion, \
    trash_conversion, restore_conversion, delete_conversion_permanent
from tateyomi.web.auth import oauth

# ── アプリ初期化 ───────────────────────────────────────────────────────────

app = FastAPI(title="tateyomi Web", docs_url=None, redoc_url=None)

_SECRET_KEY = os.environ.get("SECRET_KEY", "tateyomi-dev-secret-change-in-production")
app.add_middleware(SessionMiddleware, secret_key=_SECRET_KEY)

_WEB_DIR = Path(__file__).parent
_UPLOAD_DIR = Path(tempfile.gettempdir()) / "tateyomi_uploads"
_UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory=str(_WEB_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(_WEB_DIR / "templates"))


@app.on_event("startup")
async def startup():
    init_db()


# ── ヘルパー ──────────────────────────────────────────────────────────────

def _current_user(request: Request) -> dict | None:
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    return get_user(user_id)


def _require_login(request: Request) -> dict:
    user = _current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="ログインが必要です")
    return user


# ── ページルート ──────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    user = _current_user(request)
    return templates.TemplateResponse(
        request=request, name="index.html", context={"user": user}
    )


@app.get("/convert", response_class=HTMLResponse)
async def convert_page(request: Request):
    user = _current_user(request)
    if not user:
        return RedirectResponse("/login")
    history = get_user_conversions(user["id"])
    return templates.TemplateResponse(
        request=request, name="convert.html", context={"user": user, "history": history}
    )


@app.get("/trash", response_class=HTMLResponse)
async def trash_page(request: Request):
    user = _current_user(request)
    if not user:
        return RedirectResponse("/login")
    trashed = get_user_conversions(user["id"], include_deleted=True)
    return templates.TemplateResponse(
        request=request, name="trash.html", context={"user": user, "trashed": trashed}
    )


# ── Google OAuth ──────────────────────────────────────────────────────────

@app.get("/login")
async def login(request: Request):
    redirect_uri = str(request.url_for("auth_callback"))
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/callback")
async def auth_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        return RedirectResponse("/?error=auth_failed")

    user_info = token.get("userinfo")
    if not user_info:
        return RedirectResponse("/?error=no_user_info")

    user = upsert_user(
        google_id=user_info["sub"],
        email=user_info["email"],
        name=user_info.get("name", ""),
        picture=user_info.get("picture", ""),
    )
    request.session["user_id"] = user["id"]
    return RedirectResponse("/convert")


@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/")


# ── 変換 API ──────────────────────────────────────────────────────────────

_ALLOWED_INPUT = {".epub", ".txt", ".docx", ".md", ".html", ".htm", ".pdf"}
_ALLOWED_OUTPUT = {".epub", ".html", ".pdf"}


def _do_convert(input_path: Path, output_path: Path, chapters_dir: Path | None = None) -> None:
    """同期変換処理（スレッドプールで実行）"""
    from tateyomi.parsers.epub_parser import EpubParser
    from tateyomi.parsers.txt_parser import TxtParser
    from tateyomi.parsers.docx_parser import DocxParser
    from tateyomi.parsers.md_parser import MdParser
    from tateyomi.parsers.html_parser import HtmlParser
    from tateyomi.transform import text_transform, html_transform
    from tateyomi.renderers.epub3_renderer import render as epub_render
    from tateyomi.renderers.html_renderer import render as html_render

    ext = input_path.suffix.lower()
    parser_map = {
        ".epub": EpubParser,
        ".txt": TxtParser,
        ".docx": DocxParser,
        ".md": MdParser,
        ".html": HtmlParser,
        ".htm": HtmlParser,
        ".pdf": __import__("tateyomi.parsers.pdf_parser", fromlist=["PdfParser"]).PdfParser,
    }
    book = parser_map[ext]().parse(input_path)
    book = text_transform.transform(book)
    book = html_transform.transform(book)

    # 読書ビューア用に章HTMLを保存
    if chapters_dir:
        chapters_dir.mkdir(parents=True, exist_ok=True)
        css = (Path(__file__).parent.parent / "assets" / "tateyomi.css").read_text(encoding="utf-8")
        for i, ch in enumerate(book.chapters):
            ch_file = chapters_dir / f"chapter_{i:03d}.html"
            ch_file.write_text(_wrap_reader_html(ch.html_content, ch.title or f"第{i+1}章", css), encoding="utf-8")

    if output_path.suffix.lower() == ".epub":
        epub_render(book, output_path)
    elif output_path.suffix.lower() == ".pdf":
        from tateyomi.renderers.pdf_renderer import render as pdf_render
        pdf_render(book, output_path)
    else:
        html_render(book, output_path)


def _wrap_reader_html(body_html: str, title: str, css: str) -> str:
    import re
    body = re.search(r"<body[^>]*>(.*?)</body>", body_html, re.DOTALL)
    content = body.group(1) if body else body_html
    return f"""<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{title}</title>
<style>{css}</style>
</head><body>{content}</body></html>"""


@app.post("/api/convert")
async def api_convert(
    request: Request,
    file: UploadFile = File(...),
    output_format: str = Form("epub"),
):
    user = _require_login(request)

    in_ext = Path(file.filename or "").suffix.lower()
    if in_ext not in _ALLOWED_INPUT:
        raise HTTPException(400, f"対応していない入力形式: {in_ext}")

    out_ext = f".{output_format.lstrip('.')}"
    if out_ext not in _ALLOWED_OUTPUT:
        raise HTTPException(400, f"対応していない出力形式: {out_ext}")

    # アップロードファイルを保存
    user_dir = _UPLOAD_DIR / user["id"]
    user_dir.mkdir(exist_ok=True)

    original_name = Path(file.filename or "upload").stem
    output_name = original_name + "_tate" + out_ext
    input_path = user_dir / (original_name + in_ext)
    output_path = user_dir / output_name

    content = await file.read()
    input_path.write_bytes(content)

    # DB に変換ジョブ登録
    conv_id = create_conversion(user["id"], file.filename or "", output_name)

    # 章HTMLの保存先
    chapters_dir = user_dir / f"{conv_id}_chapters"

    # バックグラウンドで変換実行
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(
            None, partial(_do_convert, input_path, output_path, chapters_dir)
        )
        update_conversion(conv_id, "done", str(output_path), chapters_dir=str(chapters_dir))
    except Exception as e:
        update_conversion(conv_id, "error", error_msg=str(e))
        raise HTTPException(500, f"変換エラー: {e}")
    finally:
        try:
            input_path.unlink(missing_ok=True)
        except Exception:
            pass

    return JSONResponse({"conv_id": conv_id, "output_name": output_name, "read_url": f"/read/{conv_id}"})


@app.get("/download/{conv_id}")
async def download(conv_id: str, request: Request):
    user = _require_login(request)
    conv = get_conversion(conv_id)
    if not conv or conv["user_id"] != user["id"]:
        raise HTTPException(404, "変換結果が見つかりません")
    if conv["status"] != "done":
        raise HTTPException(404, "変換が完了していません")

    file_path = Path(conv["file_path"])
    if not file_path.exists():
        raise HTTPException(404, "ファイルが見つかりません（期限切れの可能性）")

    return FileResponse(
        str(file_path),
        filename=conv["output_name"],
        media_type="application/octet-stream",
    )


@app.get("/api/history")
async def api_history(request: Request):
    user = _require_login(request)
    return get_user_conversions(user["id"])


@app.post("/api/trash/{conv_id}")
async def api_trash(conv_id: str, request: Request):
    user = _require_login(request)
    conv = get_conversion(conv_id)
    if not conv or conv["user_id"] != user["id"]:
        raise HTTPException(404, "見つかりません")
    trash_conversion(conv_id)
    return {"ok": True}


@app.post("/api/restore/{conv_id}")
async def api_restore(conv_id: str, request: Request):
    user = _require_login(request)
    conv = get_conversion(conv_id)
    if not conv or conv["user_id"] != user["id"]:
        raise HTTPException(404, "見つかりません")
    restore_conversion(conv_id)
    return {"ok": True}


@app.delete("/api/delete/{conv_id}")
async def api_delete(conv_id: str, request: Request):
    user = _require_login(request)
    conv = get_conversion(conv_id)
    if not conv or conv["user_id"] != user["id"]:
        raise HTTPException(404, "見つかりません")
    file_path = delete_conversion_permanent(conv_id)
    if file_path:
        try:
            Path(file_path).unlink(missing_ok=True)
        except Exception:
            pass
    return {"ok": True}


@app.get("/preview/{conv_id}", response_class=HTMLResponse)
async def preview(conv_id: str, request: Request):
    user = _require_login(request)
    conv = get_conversion(conv_id)
    if not conv or conv["user_id"] != user["id"]:
        raise HTTPException(404, "見つかりません")
    if conv["status"] != "done":
        raise HTTPException(404, "変換が完了していません")
    file_path = Path(conv["file_path"])
    if not file_path.exists():
        raise HTTPException(404, "ファイルが見つかりません（期限切れの可能性）")
    if file_path.suffix.lower() == ".html":
        return HTMLResponse(file_path.read_text(encoding="utf-8"))
    # EPUB/PDF はダウンロードを促す
    raise HTTPException(400, "このファイル形式はダウンロード後に専用リーダーで確認してください")


@app.get("/read/{conv_id}", response_class=HTMLResponse)
async def read_book(conv_id: str, request: Request, chapter: int = 0):
    user = _require_login(request)
    conv = get_conversion(conv_id)
    if not conv or conv["user_id"] != user["id"]:
        raise HTTPException(404, "見つかりません")
    if conv["status"] != "done":
        raise HTTPException(404, "変換が完了していません")

    chapters_dir = Path(conv["chapters_dir"]) if conv.get("chapters_dir") else None
    if not chapters_dir or not chapters_dir.exists():
        raise HTTPException(404, "読書データが見つかりません。再変換してください。")

    chapter_files = sorted(chapters_dir.glob("chapter_*.html"))
    if not chapter_files:
        raise HTTPException(404, "章データが見つかりません")

    chapter = max(0, min(chapter, len(chapter_files) - 1))
    raw = chapter_files[chapter].read_text(encoding="utf-8")
    # body内コンテンツのみ抽出
    import re as _re
    m = _re.search(r"<body[^>]*>(.*?)</body>", raw, _re.DOTALL)
    content = m.group(1) if m else raw
    total = len(chapter_files)
    title = conv["original_name"]

    return templates.TemplateResponse(
        request=request,
        name="reader.html",
        context={
            "user": user,
            "content": content,
            "conv_id": conv_id,
            "chapter": chapter,
            "total": total,
            "title": title,
            "prev": chapter - 1 if chapter > 0 else None,
            "next": chapter + 1 if chapter < total - 1 else None,
        }
    )
