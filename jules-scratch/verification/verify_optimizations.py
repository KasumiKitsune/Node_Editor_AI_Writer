from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Click the "Start Creating" button
        page.get_by_role("button", name="开始创作").click()

        # Click the "Help" button to open the modal
        page.get_by_role("button", name="帮助").click()

        # Load the "General" example
        page.get_by_role("button", name="通用示例").click()

        # Confirm loading the example
        page.get_by_role("button", name="确认").click()

        # Open the minimap
        page.get_by_role("button", name="导航图").click()

        # Take a screenshot of the initial minimap
        page.screenshot(path="jules-scratch/verification/minimap_initial.png")

        # Simulate zooming in
        page.get_by_text("导航图").hover()
        page.mouse.wheel(0, -100)
        page.screenshot(path="jules-scratch/verification/minimap_zoomed.png")

        # Simulate panning
        page.mouse.wheel(-100, 0)
        page.screenshot(path="jules-scratch/verification/minimap_panned.png")

        # Trigger a layout change
        page.get_by_role("button", name="层级布局").click()
        page.screenshot(path="jules-scratch/verification/layout_changed.png")

        browser.close()

if __name__ == "__main__":
    run()
