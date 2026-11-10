"""Optional Gradio demo. The FastAPI /demo page works without Gradio."""
from __future__ import annotations

def launch():
    try:
        import gradio as gr
    except ImportError as e:
        raise SystemExit("Gradio is not installed. Use `python server.py` and open /demo instead.") from e
    from ask_torah.answer import answer_question

    def run(question: str) -> str:
        a = answer_question(question or "")
        lines = [a.get("verdict_text") or "", "", a.get("explanation") or ""]
        for p in a.get("passages") or []:
            lines += ["", p["ref"], p["he"], p["en"], p["href"]]
        for p in a.get("later_sources") or []:
            lines += ["", p.get("ref") or "", p.get("note") or "", p.get("href") or ""]
        return "\n".join(lines)

    gr.Interface(
        fn=run,
        inputs=gr.Textbox(label="Your question"),
        outputs=gr.Textbox(label="Answer"),
        title="Ask the Torah",
        description="Questions about the Torah, the Tanakh, and Jewish texts. Answers quote real verses and lead you to the passage.",
    ).launch()


if __name__ == "__main__":
    launch()
