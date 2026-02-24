import importlib


backend_module = importlib.import_module("app")
flask_app = backend_module.app


def test_health_endpoint():
    client = flask_app.test_client()
    resp = client.get("/api/health")
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["status"] == "ok"
    assert "electron_mode" in payload


def test_compile_sanitizes_filename(monkeypatch):
    captured = {}

    def fake_compile(content, filename, compiler):
        captured["filename"] = filename
        captured["compiler"] = compiler
        return "dummy.pdf", None

    monkeypatch.setattr(backend_module, "compile_latex", fake_compile)
    client = flask_app.test_client()

    resp = client.post(
        "/api/compile",
        json={
            "content": "\\documentclass{article}\\begin{document}Hi\\end{document}",
            "filename": "../bad file!!",
            "compiler": "pdflatex",
        },
    )

    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["success"] is True
    assert payload["pdf_filename"] == "badfile.pdf"
    assert captured["filename"] == "badfile"
    assert captured["compiler"] == "pdflatex"


def test_compile_error_returns_400(monkeypatch):
    def fake_compile(content, filename, compiler):
        return None, "Compiler not found"

    monkeypatch.setattr(backend_module, "compile_latex", fake_compile)
    client = flask_app.test_client()

    resp = client.post(
        "/api/compile",
        json={
            "content": "x",
            "filename": "document",
            "compiler": "pdflatex",
        },
    )

    assert resp.status_code == 400
    payload = resp.get_json()
    assert payload["success"] is False
    assert "error" in payload
