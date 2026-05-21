"""Tests for the winner email template — `_build_winner_html` now embeds a prize image."""
from app.services.email import _build_winner_html


def test_winner_html_includes_prize_image_when_url_provided():
    html = _build_winner_html(
        name="Lucky Person",
        event_title="Spring Gala",
        prize_title="iPhone 16",
        prize_image_url="http://minio-public.test/test-bucket/events/x/prizes/y.png",
    )

    assert "Lucky Person" in html
    assert "Spring Gala" in html
    assert "iPhone 16" in html
    assert 'src=\'http://minio-public.test/test-bucket/events/x/prizes/y.png\'' in html
    assert "alt='iPhone 16'" in html
    assert "border-radius:12px" in html  # image styling applied


def test_winner_html_omits_image_when_url_missing():
    html = _build_winner_html(
        name="No-Image Winner",
        event_title="Spring Gala",
        prize_title="Mystery Box",
        prize_image_url=None,
    )

    assert "No-Image Winner" in html
    assert "Mystery Box" in html
    # No <img> tag at all when image url is absent.
    assert "<img" not in html


def test_winner_html_renders_without_prize_at_all():
    html = _build_winner_html(
        name="Anonymous",
        event_title="Spring Gala",
        prize_title=None,
        prize_image_url=None,
    )

    assert "Anonymous" in html
    assert "Spring Gala" in html
    # Neither prize line nor image is rendered.
    assert "Prize:" not in html
    assert "<img" not in html


def test_winner_html_uses_default_name_when_blank():
    html = _build_winner_html(
        name="",
        event_title="Spring Gala",
        prize_title="Trophy",
        prize_image_url=None,
    )

    assert "Hi <strong>there</strong>" in html
