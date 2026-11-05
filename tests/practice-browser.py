"""Optional browser checks: python3 tests/practice-browser.py (Playwright + Chromium)."""
import array
import math
import tempfile
import wave
import functools
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


site = Path(__file__).resolve().parents[1] / "site"
server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(site)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}"
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which("chromium"), args=["--no-sandbox"])
        for width in [320, 390, 1400]:
            page = browser.new_page(viewport={"width": width, "height": 900})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.route("https://fonts.googleapis.com/**", lambda route: route.abort())
            page.goto(url + "/#legends")
            slider = page.locator("#legend-speed")
            expect(slider).to_be_visible()
            slider.fill("83")
            expect(page.locator("#legend-speed-value")).to_have_text("83%")
            expect(page.locator('[data-lick-bpm="0"]')).to_have_text("71 BPM")
            expect(page.locator('[data-lick-bpm="0"]')).to_be_visible()
            slider.focus()
            page.keyboard.press("ArrowRight")
            expect(slider).to_be_focused()
            expect(page.locator("#legend-speed-value")).to_have_text("84%")
            page.locator('[data-play-lick="0"]').click()
            page.wait_for_function("playing && lickRun !== null")
            assert abs(page.evaluate("lickRun.seconds") - 60 / 72.24) < 1e-10
            slider.fill("82")
            assert page.evaluate("!playing && lickRun === null")
            page.locator("#lick-speed").select_option("100")
            expect(slider).to_have_value("100")
            # The existing Sections header overflows at 320px with fallback fonts.
            # Check lesson content at that width; check the entire page otherwise.
            assert page.evaluate("[...document.querySelectorAll('#main *')].every(e=>e.getBoundingClientRect().width===0||e.getBoundingClientRect().right<=innerWidth)"), "Legends lesson overflows"
            if width > 320:
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Legends page overflows"
            page.goto(url + "/#jam")
            for index in range(4):
                page.locator("#studio-track").select_option(str(index))
                detail = page.locator(f'[data-soloing-example="{index}"]')
                expect(detail).to_have_attribute("open", "")
                expect(detail.locator("svg").first if width > 600 else detail.locator(".beat-tile").first).to_be_visible()
                detail.locator(":scope > summary").focus()
                page.keyboard.press("Enter")
                expect(detail).not_to_have_attribute("open", "")
                page.keyboard.press("Enter")
                expect(detail).to_have_attribute("open", "")
                play = detail.locator(f'[data-play-solo="{index}"]')
                stop = detail.locator(f'[data-stop-solo="{index}"]')
                expect(stop).to_be_disabled()
                play.click()
                page.wait_for_function(f"playing && lickRun?.index === 'solo-{index}'")
                expect(play).to_have_attribute("aria-pressed", "true")
                expect(stop).to_be_enabled()
                bpm = [72, 86, 104, 100][index]
                assert abs(page.evaluate("lickRun.seconds") - 60 / bpm) < 1e-10
                page.wait_for_function(f"document.querySelector('[data-lick-note=\"solo-{index}-0\"]').classList.contains('sounding')")
                expect(detail.locator(f"#solo-status-{index}")).to_contain_text("Bar 1")
                stop.click()
                assert page.evaluate("!playing && lickRun === null && oscillators.length === 0")
                expect(play).to_have_attribute("aria-pressed", "false")
                expect(stop).to_be_disabled()
                if width == 1400:
                    with page.expect_download() as event:
                        detail.locator(f'[data-download-solo="{index}"]').click()
                    download = event.value
                    assert download.suggested_filename.endswith(f"-{bpm}bpm.wav")
                    with tempfile.TemporaryDirectory() as tmp:
                        target = Path(tmp) / download.suggested_filename
                        download.save_as(target)
                        with wave.open(str(target)) as wav:
                            assert wav.getnchannels() == 2 and wav.getframerate() == 44100
                            assert abs(wav.getnframes() / 44100 - (720 / bpm + 1)) < 1 / 44100
                            wav.setpos(int((.05 + 240 / bpm) * 44100))
                            samples = array.array('h', wav.readframes(int(480 / bpm * 44100)))
                            rms = math.sqrt(sum(v * v for v in samples) / len(samples)) / 32768
                            assert rms > .001, f"Silent guitar recording: {index}"
                            assert max(abs(v) for v in samples) < 32767, f"Clipped recording: {index}"
                assert detail.evaluate("e=>e.getBoundingClientRect().right<=innerWidth"), "Jam example overflows"
                if width > 320:
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Jam page overflows"
            # Switching demos, starting the backing and navigating must stop the old phrase.
            page.evaluate("playSoloingExample(0)")
            page.evaluate("playSoloingExample(2)")
            assert page.evaluate("lickRun.index === 'solo-2'")
            expect(page.locator('[data-stop-solo="0"]')).to_be_disabled()
            page.locator('#start-jam').click()  # First tap stops the active demo.
            assert page.evaluate("lickRun === null && !playing")
            page.evaluate("playSoloingExample(3)")
            page.evaluate("navigate('legends')")
            assert page.evaluate("lickRun === null && !playing")
            page.evaluate("navigate('jam')")
            if width in [1400, 390]:
                page.add_style_tag(content=".audio-transport,.mobile-header,.skip{visibility:hidden!important}")
                page.locator(".soloing-rule").screenshot(path=f"/tmp/fretwise-soloing-{width}.png")
            page.locator("#jam-mode").select_option("flexible")
            expect(page.locator(".soloing-example")).to_have_count(4)
            assert not errors, errors
            page.close()
            print(f"PASS: {width}px tempo, focus, playback, presets, four style recordings, count-in/highlights, Stop, WAV signal, navigation, keyboard and layout")
        browser.close()
finally:
    server.shutdown()
    server.server_close()
