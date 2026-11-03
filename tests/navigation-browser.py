"""Optional UI regression checks: python3 tests/navigation-browser.py.

Requires the development-only Playwright Python package and Chromium.
Starts a temporary local server; never contacts or changes the live site.
"""
import functools
import os
from pathlib import Path
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright, expect


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


site = Path(__file__).resolve().parents[1] / "site"
server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(site)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}"
routes = ["scales", "harmony", "progressions", "modes", "jam", "licks", "rhythm", "legends", "listen", "releases"]

try:
    with sync_playwright() as playwright:
        executable = os.environ.get("CHROMIUM_PATH") or shutil.which("chromium") or shutil.which("chromium-browser")
        browser = playwright.chromium.launch(executable_path=executable, args=["--no-sandbox"])
        for width, height in [(1280, 600), (390, 844), (844, 390), (640, 400), (320, 568)]:
            context = browser.new_context(viewport={"width": width, "height": height})
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.route("https://fonts.googleapis.com/**", lambda route: route.abort())
            page.goto(url)
            expect(page.locator(".home-card")).to_have_count(10)
            expect(page.locator("#breadcrumb")).to_have_text("Home")
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Home overflows horizontally"
            # Every homepage card opens a section and the section menu marks it current.
            for route in routes:
                page.locator(f'.home-card[href="#{route}"]').click()
                expect(page.locator(f'.sidebar .nav[data-view="{route}"]')).to_have_attribute("aria-current", "page")
                expect(page.locator("#main h1")).to_have_count(1)
                page.go_back()
                expect(page.locator("#breadcrumb")).to_have_text("Home")
            page.go_forward()
            expect(page.locator("#breadcrumb")).to_have_text("Release list")
            page.goto(url + "/#listen")
            expect(page.locator("#breadcrumb")).to_have_text("Fretwise listens")
            page.locator('.skip').focus()
            page.keyboard.press('Enter')
            expect(page.locator("#breadcrumb")).to_have_text("Fretwise listens")
            expect(page.locator("#main")).to_be_focused()
            assert page.url.endswith('#listen'), "Skip to lesson must preserve the current section"
            if width <= 960:
                toggle = page.locator("#sections-toggle")
                toggle.click()
                expect(toggle).to_have_attribute("aria-expanded", "true")
                expect(page.locator("#sections-close")).to_be_focused()
                assert page.locator(".workspace").evaluate("node => node.inert")
                assert page.evaluate("getComputedStyle(document.body).overflow == 'hidden'")
                # The last entry stays reachable and Tab wraps within the open panel.
                last = page.locator('.sidebar .nav[data-view="releases"]')
                last.focus()
                page.keyboard.press("Tab")
                expect(page.locator(".sidebar .brand")).to_be_focused()
                page.keyboard.press("Shift+Tab")
                expect(last).to_be_focused()
                page.keyboard.press("Escape")
                expect(toggle).to_be_focused()
                expect(toggle).to_have_attribute("aria-expanded", "false")
                assert not page.locator(".workspace").evaluate("node => node.inert")
                toggle.click()
                page.locator("#sections-close").click()
                expect(toggle).to_be_focused()
                toggle.click()
                page.mouse.click(width - 5, height / 2)
                expect(toggle).to_have_attribute("aria-expanded", "false")
                toggle.click()
                last.click()
                expect(page.locator("#breadcrumb")).to_have_text("Release list")
                expect(page.locator("#main")).to_be_focused()
                expect(toggle).to_have_attribute("aria-expanded", "false")
                assert page.locator(".sidebar").evaluate("node => node.inert")
                # Resizing across the breakpoint releases all modal state.
                toggle.click()
                page.set_viewport_size({"width": 1280, "height": 600})
                assert not page.locator(".workspace").evaluate("node => node.inert")
                assert not page.locator(".sidebar").evaluate("node => node.inert")
                page.set_viewport_size({"width": width, "height": height})
                expect(toggle).to_be_focused()
            else:
                nav = page.locator(".section-scroll")
                assert nav.evaluate("node => node.scrollHeight > node.clientHeight"), "Short windows need an independently scrolling menu"
                nav.evaluate("node => node.scrollTop = node.scrollHeight")
                last = page.locator('.sidebar .nav[data-view="releases"]')
                bounds, item = nav.bounding_box(), last.bounding_box()
                assert item["y"] >= bounds["y"] and item["y"] + item["height"] <= bounds["y"] + bounds["height"]
                last.click()
                expect(page.locator("#breadcrumb")).to_have_text("Release list")
            expect(page.locator("#stop-all")).to_be_visible()
            # Unknown/prototype hashes safely return to the homepage.
            page.goto(url + "/#constructor")
            expect(page.locator("#breadcrumb")).to_have_text("Home")
            assert not errors, errors
            print(f"PASS: {width}×{height}: ten cards, history, direct links, navigation and focus")
            context.close()
        browser.close()
finally:
    server.shutdown()
