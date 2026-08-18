# arc42-language demo
# Render with: vhs demo/demo.tape
# Install vhs: brew install vhs  (requires ffmpeg + ttyd)
#
# Assumes `arc42` is on PATH. Run from repo root after:
#   pnpm run build
#   ln -sf $(pwd)/packages/cli/dist/cli.mjs ~/.local/bin/arc42

Output demo/demo.gif
Output demo/demo.mp4

Set Shell "bash"
Set FontSize 14
Set Width 1000
Set Height 620
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set TypingSpeed 30ms

# ── Why this exists ───────────────────────────────────────────────────────────
Type "cat demo/motivation.txt"
Enter
Sleep 8s

# ── Clear guidance ────────────────────────────────────────────────────────────
Type "clear"
Enter
Sleep 200ms
Type "echo '=== Clear guidance – for humans and agents ==='"
Sleep 1200ms
Enter
Type "arc42 rules"
Enter
Sleep 5s

# ── See what's documented ─────────────────────────────────────────────────────
Type "clear"
Enter
Sleep 200ms
Type "echo '=== See what is documented ==='"
Sleep 1200ms
Enter
Type "arc42 --dir examples/bookstore-backend get"
Enter
Sleep 4s

# ── Trace a decision ──────────────────────────────────────────────────────────
Type "clear"
Enter
Sleep 200ms
Type "echo '=== Trace a decision ==='"
Sleep 1200ms
Enter
Type "arc42 --dir examples/bookstore-backend get dec-jwt-auth"
Enter
Sleep 3s

# ── Ensure consistency of architecture ────────────────────────────────────────
Type "clear"
Enter
Sleep 200ms
Type "echo '=== Ensure consistency of architecture ==='"
Sleep 1200ms
Enter
Type "arc42 --dir examples/bookstore-backend validate"
Enter
Sleep 2.5s

# ── Drift gets caught ─────────────────────────────────────────────────────────
Type "clear"
Enter
Sleep 200ms
Type "echo '=== Drift gets caught ==='"
Sleep 1200ms
Enter
Type "arc42 --dir packages/core/src/__fixtures__/mini-arch validate"
Enter
Sleep 5s

# ── Check it out! ────────────────────────────────────────────────────────────
Type "clear"
Enter
Sleep 200ms
Type "echo '=== Check it out! ==='"
Sleep 1200ms
Enter
Type "echo '=== Or ask your agent to check it out ;-) ==='"
Sleep 1200ms
Enter
Type "echo 'github.com/mrsimpson/arc42-language'"
Enter
Sleep 2.5s
