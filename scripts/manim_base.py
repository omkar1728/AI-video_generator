"""Shared Manim style for manim scenes (3Blue1Brown look). Import in jobs/<job>/manim_scenes.py:

    from manim_base import BaseScene, C

Rules baked in (from the manim-video skill, hermes-agent):
- one palette for the whole video (C below); never random colours per scene
- geometry before algebra: draw the shape, then the formula
- opacity layering: primary 1.0, context 0.4, structure (axes, grids) 0.15
- every reveal is followed by a wait, so the viewer can read it
- the Kokoro narration is the clock: build.py pads or trims the clip to the spoken length,
  so end each scene with a short hold rather than tuning exact timings
"""
from manim import Axes, DOWN, FadeIn, RIGHT, Rectangle, Scene, Text, UP, VGroup, Write, config

BG = "#0b0f1e"
C = {
    "ink": "#f5f7ff",       # main text
    "muted": "#8b95b0",     # secondary text
    "blue": "#58c4dd",      # primary idea
    "teal": "#5cd6b0",      # second idea / result
    "yellow": "#ffd166",    # the aha element, use sparingly
    "red": "#ff6b6b",       # errors, what goes wrong
}
FONT = "DejaVu Sans"        # plain text; MathTex needs LaTeX installed
PRIMARY, CONTEXT, STRUCTURE = 1.0, 0.4, 0.15

config.background_color = BG


class BaseScene(Scene):
    """Subclass per scene: implement construct(), call self.beat() after each reveal."""

    def beat(self, seconds: float = 1.2) -> None:
        self.wait(seconds)

    def title(self, text: str, color: str = C["ink"]) -> VGroup:
        t = Text(text, font=FONT, color=color, font_size=40).to_edge(UP, buff=0.5)
        self.play(Write(t), run_time=1.2)
        self.beat(0.8)
        return t

    def layered(self, primary=(), context=(), structure=()) -> None:
        """Set opacity by role before the reveal, so the eye goes to the primary element."""
        for m in primary:
            m.set_opacity(PRIMARY)
        for m in context:
            m.set_opacity(CONTEXT)
        for m in structure:
            m.set_opacity(STRUCTURE)

    def caption(self, text: str, color: str = C["muted"]) -> Text:
        """One short line at the bottom. Keep it under 6 words; the narration says the rest."""
        t = Text(text, font=FONT, color=color, font_size=28).to_edge(DOWN, buff=0.6)
        return t

    def show_caption(self, text: str, color: str = C["muted"]) -> Text:
        t = self.caption(text, color)
        self.play(FadeIn(t, shift=UP * 0.1), run_time=0.6)
        return t

    def axes(self, x_range=(-4, 4, 1), y_range=(-2, 2, 1)) -> Axes:
        ax = Axes(x_range=list(x_range), y_range=list(y_range), x_length=9, y_length=5,
                  axis_config={"color": C["ink"], "stroke_opacity": STRUCTURE})
        return ax

    def boxes_row(self, labels: list[str], color: str = C["blue"]) -> VGroup:
        """Labelled boxes in a row (a list, a stack of pages, a queue). Good for algorithm steps."""
        boxes = VGroup()
        for lab in labels:
            r = Rectangle(width=1.6, height=0.9, color=color)
            r.add(Text(lab, font=FONT, font_size=26, color=C["ink"]).move_to(r.get_center()))
            boxes.add(r)
        boxes.arrange(RIGHT, buff=0.25)
        return boxes
