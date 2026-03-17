"""
tateyomi GUI
tkinter ベースのドラッグ&ドロップ対応変換ウィンドウ
"""
from __future__ import annotations
import os
import sys
import threading
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox


# Windows 高DPI 対応
try:
    from ctypes import windll
    windll.shcore.SetProcessDpiAwareness(1)
except Exception:
    pass


ACCENT = "#2D6CDF"
BG = "#F5F5F5"
CARD = "#FFFFFF"
TEXT = "#1A1A1A"
MUTED = "#666666"
SUCCESS = "#2E7D32"
ERROR = "#C62828"

INPUT_EXTS = [".epub", ".pdf", ".txt"]
OUTPUT_FORMATS = {"EPUB3 (Kindle対応)": ".epub", "HTML (ブラウザ印刷)": ".html", "PDF (GTK必要)": ".pdf"}


class TateyomiApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("tateyomi — 縦書き変換ツール")
        self.geometry("620x580")
        self.resizable(False, False)
        self.configure(bg=BG)

        self._input_path: Path | None = None
        self._output_format = tk.StringVar(value=list(OUTPUT_FORMATS.keys())[0])
        self._title_var = tk.StringVar()
        self._author_var = tk.StringVar()
        self._tcy_var = tk.BooleanVar(value=True)
        self._status_var = tk.StringVar(value="ファイルを選択してください")

        self._build_ui()
        self._setup_drop()

    # ──────────────────────────────────────────────────
    # UI 構築
    # ──────────────────────────────────────────────────
    def _build_ui(self) -> None:
        pad = dict(padx=20, pady=8)

        # ヘッダー
        hdr = tk.Frame(self, bg=ACCENT, height=56)
        hdr.pack(fill="x")
        tk.Label(hdr, text="  tateyomi  縦書き変換", font=("Yu Gothic UI", 15, "bold"),
                 bg=ACCENT, fg="white").pack(side="left", padx=16, pady=12)

        # ドロップゾーン
        self._drop_frame = tk.Frame(self, bg=CARD, relief="solid", bd=1,
                                    highlightbackground="#CCCCCC", highlightthickness=1)
        self._drop_frame.pack(fill="x", **pad, ipady=20)

        self._drop_icon = tk.Label(self._drop_frame, text="📂", font=("Segoe UI Emoji", 28),
                                   bg=CARD)
        self._drop_icon.pack()
        self._drop_label = tk.Label(self._drop_frame,
                                    text="ここにファイルをドロップ\nまたは下のボタンで選択",
                                    font=("Yu Gothic UI", 10), bg=CARD, fg=MUTED,
                                    justify="center")
        self._drop_label.pack()

        # ファイル選択ボタン
        btn_frame = tk.Frame(self, bg=BG)
        btn_frame.pack(fill="x", padx=20, pady=4)
        ttk.Button(btn_frame, text="ファイルを選択...", command=self._browse_input
                   ).pack(side="left")
        self._file_label = tk.Label(btn_frame, text="", font=("Yu Gothic UI", 9),
                                    bg=BG, fg=MUTED)
        self._file_label.pack(side="left", padx=10)

        # 区切り線
        ttk.Separator(self, orient="horizontal").pack(fill="x", padx=20, pady=6)

        # オプション
        opts = tk.Frame(self, bg=BG)
        opts.pack(fill="x", padx=20)

        # 出力形式
        tk.Label(opts, text="出力形式", font=("Yu Gothic UI", 9, "bold"),
                 bg=BG, fg=TEXT).grid(row=0, column=0, sticky="w", pady=4)
        fmt_frame = tk.Frame(opts, bg=BG)
        fmt_frame.grid(row=0, column=1, sticky="w", padx=12)
        for label in OUTPUT_FORMATS:
            ttk.Radiobutton(fmt_frame, text=label, variable=self._output_format,
                            value=label).pack(side="left", padx=6)

        # タイトル
        tk.Label(opts, text="タイトル", font=("Yu Gothic UI", 9, "bold"),
                 bg=BG, fg=TEXT).grid(row=1, column=0, sticky="w", pady=4)
        ttk.Entry(opts, textvariable=self._title_var, width=38
                  ).grid(row=1, column=1, sticky="w", padx=12)
        tk.Label(opts, text="(空欄=元ファイルから取得)", font=("Yu Gothic UI", 8),
                 bg=BG, fg=MUTED).grid(row=1, column=2, sticky="w")

        # 著者
        tk.Label(opts, text="著者", font=("Yu Gothic UI", 9, "bold"),
                 bg=BG, fg=TEXT).grid(row=2, column=0, sticky="w", pady=4)
        ttk.Entry(opts, textvariable=self._author_var, width=38
                  ).grid(row=2, column=1, sticky="w", padx=12)

        # 縦中横
        ttk.Checkbutton(opts, text="縦中横を有効にする（数字・英数字を横組み）",
                        variable=self._tcy_var).grid(row=3, column=0, columnspan=3,
                                                      sticky="w", pady=4)

        # 区切り線
        ttk.Separator(self, orient="horizontal").pack(fill="x", padx=20, pady=8)

        # 変換ボタン
        self._convert_btn = ttk.Button(self, text="変換開始", command=self._start_convert,
                                       style="Accent.TButton")
        self._convert_btn.pack(pady=4)

        # プログレスバー
        self._progress = ttk.Progressbar(self, mode="indeterminate", length=560)
        self._progress.pack(padx=20, pady=4)

        # ステータス
        self._status_label = tk.Label(self, textvariable=self._status_var,
                                      font=("Yu Gothic UI", 9), bg=BG, fg=MUTED,
                                      wraplength=560, justify="left")
        self._status_label.pack(padx=20, pady=4, anchor="w")

        # ログエリア
        log_frame = tk.Frame(self, bg=BG)
        log_frame.pack(fill="both", expand=True, padx=20, pady=(0, 12))
        self._log = tk.Text(log_frame, height=7, font=("Consolas", 8),
                            bg="#1E1E1E", fg="#D4D4D4", relief="flat",
                            state="disabled", wrap="word")
        self._log.pack(fill="both", expand=True)
        scr = ttk.Scrollbar(log_frame, command=self._log.yview)
        scr.pack(side="right", fill="y")
        self._log["yscrollcommand"] = scr.set

        # アクセント ボタンスタイル
        style = ttk.Style()
        style.configure("Accent.TButton", font=("Yu Gothic UI", 11, "bold"))

    def _setup_drop(self) -> None:
        """Windows ドラッグ&ドロップ（tkinterdnd2があれば使用）"""
        try:
            from tkinterdnd2 import DND_FILES, TkinterDnD  # type: ignore
            self._drop_frame.drop_target_register(DND_FILES)
            self._drop_frame.dnd_bind("<<Drop>>", self._on_drop)
            self._drop_label.configure(text="ここにファイルをドロップ\n(.epub / .pdf / .txt)")
        except ImportError:
            self._drop_label.configure(
                text="ファイルを選択ボタンで入力ファイルを指定してください\n(.epub / .pdf / .txt)")

    # ──────────────────────────────────────────────────
    # イベントハンドラ
    # ──────────────────────────────────────────────────
    def _on_drop(self, event) -> None:
        path_str = event.data.strip().strip("{}")
        self._set_input(Path(path_str))

    def _browse_input(self) -> None:
        path_str = filedialog.askopenfilename(
            title="変換する電子書籍を選択",
            filetypes=[
                ("対応ファイル", "*.epub *.pdf *.txt"),
                ("EPUB", "*.epub"),
                ("PDF", "*.pdf"),
                ("テキスト", "*.txt"),
                ("すべて", "*.*"),
            ]
        )
        if path_str:
            self._set_input(Path(path_str))

    def _set_input(self, path: Path) -> None:
        if path.suffix.lower() not in INPUT_EXTS:
            messagebox.showerror("エラー", f"対応していない形式です: {path.suffix}\n対応: .epub .pdf .txt")
            return
        self._input_path = path
        self._file_label.configure(text=path.name, fg=TEXT)
        self._drop_icon.configure(text="✅")
        self._drop_label.configure(text=f"{path.name}", fg=TEXT)
        self._status_var.set(f"準備完了: {path.name}")
        self._log_append(f"入力ファイル: {path}\n")

        # メタデータ自動取得
        self._try_read_meta(path)

    def _try_read_meta(self, path: Path) -> None:
        """バックグラウンドでメタデータを読み込み"""
        def worker():
            try:
                ext = path.suffix.lower()
                if ext == ".epub":
                    from tateyomi.parsers.epub_parser import EpubParser
                    book = EpubParser().parse(path)
                elif ext == ".pdf":
                    import pdfplumber
                    with pdfplumber.open(str(path)) as pdf:
                        meta = pdf.metadata or {}
                    book_title = meta.get("Title", "") or ""
                    book_author = meta.get("Author", "") or ""
                    self.after(0, lambda: self._title_var.set(book_title))
                    self.after(0, lambda: self._author_var.set(book_author))
                    return
                else:
                    raw = path.read_text(encoding="utf-8", errors="replace")
                    book_title = raw.splitlines()[0].strip() if raw else ""
                    self.after(0, lambda: self._title_var.set(book_title))
                    return
                self.after(0, lambda: self._title_var.set(book.title or ""))
                self.after(0, lambda: self._author_var.set(book.author or ""))
                self.after(0, lambda: self._log_append(
                    f"メタデータ取得: タイトル={book.title}, 著者={book.author}, 章数={len(book.chapters)}\n"
                ))
            except Exception as e:
                self.after(0, lambda: self._log_append(f"メタデータ取得エラー: {e}\n"))
        threading.Thread(target=worker, daemon=True).start()

    def _start_convert(self) -> None:
        if not self._input_path:
            messagebox.showwarning("警告", "入力ファイルを選択してください")
            return

        out_ext = OUTPUT_FORMATS[self._output_format.get()]
        out_path = filedialog.asksaveasfilename(
            title="保存先を選択",
            defaultextension=out_ext,
            initialfile=self._input_path.stem + "_縦書き" + out_ext,
            filetypes=[
                ("EPUB", "*.epub"), ("HTML", "*.html"), ("PDF", "*.pdf"), ("すべて", "*.*")
            ]
        )
        if not out_path:
            return

        self._convert_btn.configure(state="disabled")
        self._progress.start(10)
        self._status_var.set("変換中...")
        self._status_label.configure(fg=ACCENT)

        input_path = self._input_path
        output_path = Path(out_path)
        title = self._title_var.get().strip() or None
        author = self._author_var.get().strip() or None
        no_tcy = not self._tcy_var.get()

        threading.Thread(
            target=self._convert_worker,
            args=(input_path, output_path, title, author, no_tcy),
            daemon=True,
        ).start()

    def _convert_worker(
        self,
        input_path: Path,
        output_path: Path,
        title: str | None,
        author: str | None,
        no_tcy: bool,
    ) -> None:
        try:
            self.after(0, lambda: self._log_append(f"変換開始: {input_path.name} -> {output_path.name}\n"))

            # パース
            ext = input_path.suffix.lower()
            self.after(0, lambda: self._status_var.set(f"読み込み中: {input_path.name}"))
            if ext == ".epub":
                from tateyomi.parsers.epub_parser import EpubParser
                book = EpubParser().parse(input_path)
            elif ext == ".pdf":
                from tateyomi.parsers.pdf_parser import PdfParser
                book = PdfParser().parse(input_path)
            else:
                from tateyomi.parsers.txt_parser import TxtParser
                book = TxtParser().parse(input_path)

            self.after(0, lambda: self._log_append(
                f"読み込み完了: {len(book.chapters)}章, {len(book.images)}画像\n"
            ))

            if title:
                book.title = title
            if author:
                book.author = author

            # 変換
            self.after(0, lambda: self._status_var.set("縦書き変換中..."))
            from tateyomi.transform import text_transform, html_transform
            book = text_transform.transform(book, enable_tcy=not no_tcy)
            book = html_transform.transform(book)

            # 出力
            self.after(0, lambda: self._status_var.set(f"書き出し中: {output_path.name}"))
            out_ext = output_path.suffix.lower()

            warning_msg = None
            if out_ext == ".epub":
                from tateyomi.renderers.epub3_renderer import render
                render(book, output_path)
            elif out_ext == ".html":
                from tateyomi.renderers.html_renderer import render
                render(book, output_path)
            else:
                from tateyomi.renderers import pdf_renderer
                if not pdf_renderer.WEASYPRINT_AVAILABLE:
                    html_path = output_path.with_suffix(".html")
                    from tateyomi.renderers.html_renderer import render as html_render
                    html_render(book, html_path)
                    output_path = html_path
                    warning_msg = (
                        f"GTK/Pangoがないため、HTMLで保存しました:\n{html_path.name}\n\n"
                        "Chromeで開いて [印刷] → [PDFに保存] で縦書きPDFになります。"
                    )
                else:
                    pdf_renderer.render(book, output_path)

            size_kb = output_path.stat().st_size // 1024
            msg = f"完了: {output_path.name} ({size_kb} KB)"
            self.after(0, lambda: self._on_success(msg, output_path, warning_msg))

        except Exception as e:
            err = str(e)
            self.after(0, lambda: self._on_error(err))

    def _on_success(self, msg: str, output_path: Path, warning: str | None) -> None:
        self._progress.stop()
        self._convert_btn.configure(state="normal")
        self._status_var.set(msg)
        self._status_label.configure(fg=SUCCESS)
        self._log_append(f"[完了] {msg}\n")

        if warning:
            messagebox.showwarning("PDF変換の注意", warning)
        else:
            if messagebox.askyesno("変換完了", f"{msg}\n\n出力フォルダを開きますか？"):
                os.startfile(str(output_path.parent))

    def _on_error(self, err: str) -> None:
        self._progress.stop()
        self._convert_btn.configure(state="normal")
        self._status_var.set("エラーが発生しました")
        self._status_label.configure(fg=ERROR)
        self._log_append(f"[エラー] {err}\n")
        messagebox.showerror("変換エラー", err)

    def _log_append(self, text: str) -> None:
        self._log.configure(state="normal")
        self._log.insert("end", text)
        self._log.see("end")
        self._log.configure(state="disabled")


def main() -> None:
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    app = TateyomiApp()
    app.mainloop()


if __name__ == "__main__":
    main()
