# chromium-cli

Control Chromium-based browsers (Chrome, Brave, Edge, Arc) from the command line.

```bash
# Navigate, click, fill forms, take screenshots - all from terminal
chromium-cli go github.com
chromium-cli click "#login-btn"
chromium-cli fill "input[name=email]" "test@example.com"
chromium-cli screenshot --output page.png
```

## Features

- **Tab Management** - Create, close, navigate, pin, mute, group tabs
- **Window Control** - Open, close, minimize, maximize, fullscreen windows
- **DOM Interaction** - Click, fill, type, query elements with CSS selectors
- **Storage Access** - Read/write cookies, localStorage, sessionStorage
- **Screenshots** - Capture visible area, full page, or specific elements
- **Network Logging** - Monitor HTTP requests and responses
- **Console Capture** - Automatically capture console.log output
- **Multi-browser** - Control multiple browsers on different ports
- **Shell Completions** - Tab completion for bash and zsh

## Architecture

```
┌─────────────┐     HTTP      ┌─────────────┐    WebSocket    ┌─────────────┐
│   CLI       │ ───────────── │   Server    │ ─────────────── │  Extension  │
│  (bash)     │   curl        │  (Node.js)  │                 │  (Chrome)   │
└─────────────┘               └─────────────┘                 └─────────────┘
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/llm-cli/chromium-cli.git
cd chromium-cli
```

### 2. Install the CLI

```bash
# Add to PATH
sudo ln -s $(pwd)/cli/chromium-cli /usr/local/bin/chromium-cli

# Or add to your shell config
echo 'export PATH="$PATH:/path/to/chromium-cli/cli"' >> ~/.bashrc
```

### 3. Install the browser extension

1. Open Chrome/Brave/Edge
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `extension` directory

### 4. Start the server

```bash
# Install dependencies (first time)
cd server && npm install && cd ..

# Start the server
chromium-cli server start
```

The extension will auto-connect when the server starts.

## Shell Completions

### Bash

```bash
# Add to ~/.bashrc
source /path/to/chromium-cli/completions/chromium-cli.bash
```

### Zsh

```bash
# Copy to fpath
cp completions/chromium-cli.zsh ~/.zsh/completions/_chromium-cli

# Or source directly in ~/.zshrc
source /path/to/chromium-cli/completions/chromium-cli.zsh
```

## Quick Reference

### Navigation

```bash
chromium-cli go example.com          # Navigate current tab
chromium-cli open example.com        # Open in new tab
chromium-cli go example.com --wait   # Navigate and wait for load
chromium-cli back                    # Go back
chromium-cli forward                 # Go forward
chromium-cli reload                  # Reload page
```

### Tabs

```bash
chromium-cli ls                      # List all tabs
chromium-cli tabs create [url]       # Create new tab
chromium-cli tabs close <id>         # Close tab
chromium-cli tabs activate <id>      # Focus tab
chromium-cli find "*github*"         # Find tabs by URL/title
chromium-cli tabs pin <id>           # Pin tab
chromium-cli tabs mute <id>          # Mute tab
chromium-cli tabs duplicate <id>     # Duplicate tab
```

### DOM

```bash
chromium-cli click "button.submit"   # Click element
chromium-cli fill "input[name=q]" "search query"  # Fill input
chromium-cli text "h1"               # Get element text
chromium-cli html ".content"         # Get element HTML
chromium-cli exec "return document.title"  # Execute JavaScript
chromium-cli exists ".modal"         # Check if element exists
chromium-cli count "li"              # Count matching elements
chromium-cli dom wait ".loaded"      # Wait for element
```

### Windows

```bash
chromium-cli windows list            # List windows
chromium-cli windows create [url]    # New window
chromium-cli windows close <id>      # Close window
chromium-cli windows minimize <id>   # Minimize
chromium-cli windows maximize <id>   # Maximize
chromium-cli windows fullscreen <id> # Fullscreen
```

### Tab Groups

```bash
chromium-cli groups list             # List groups
chromium-cli groups create <ids>     # Group tabs (comma-separated)
chromium-cli groups update <id> --title "Work" --color blue
chromium-cli tabs ungroup <ids>      # Ungroup tabs
```

### Storage

```bash
# Cookies
chromium-cli cookies list
chromium-cli cookies get <name>
chromium-cli cookies set <name> <value>
chromium-cli cookies delete <name>
chromium-cli cookies clear

# localStorage / sessionStorage (same interface)
chromium-cli localstorage list
chromium-cli localstorage get <key>
chromium-cli localstorage set <key> <value>
chromium-cli sessionstorage ...
```

### Screenshots

```bash
chromium-cli screenshot              # Visible area
chromium-cli screenshot --full       # Full page
chromium-cli screenshot --element ".header"  # Element only
chromium-cli screenshot --output page.png    # Save to file
```

### Network & Console

```bash
# Network logging
chromium-cli network start           # Start logging
chromium-cli network log             # View logged requests
chromium-cli network stats           # Request statistics
chromium-cli network stop            # Stop logging

# Console capture (automatic)
chromium-cli console                 # Get captured logs
chromium-cli console --level error   # Filter by level
chromium-cli console clear           # Clear logs
```

### Server

```bash
chromium-cli server start            # Start bridge server
chromium-cli server stop             # Stop server
chromium-cli server status           # Check status
chromium-cli discover                # Find servers (ports 8765-8769)
```

## Options

| Option | Description |
|--------|-------------|
| `--port <port>` | Server port (default: 8765) |
| `--browser <id>` | Target specific browser |
| `--tab <id>` | Target specific tab |
| `--timeout, -t <ms>` | Request timeout (default: 30000) |
| `--frame <selector>` | Target iframe for DOM commands |
| `--json` | Output raw JSON |
| `--wait, -w` | Wait for page load after navigation |

## Configuration

Create `~/.chromium-cli.conf`:

```bash
CHROMIUM_CLI_PORT=8765
```

## Multi-Browser Setup

Run multiple browsers with different server ports:

| Browser | Port |
|---------|------|
| Chrome | 8765 |
| Brave | 8766 |
| Edge | 8767 |

```bash
# Start servers on different ports
CHROMIUM_CLI_PORT=8765 chromium-cli server start  # Chrome
CHROMIUM_CLI_PORT=8766 chromium-cli server start  # Brave

# Target specific browser
chromium-cli --port 8766 tabs list

# Discover all running servers
chromium-cli discover
```

## Examples

### Automate a login flow

```bash
chromium-cli go app.example.com/login --wait
chromium-cli fill "input[name=email]" "user@example.com"
chromium-cli fill "input[name=password]" "secret"
chromium-cli click "button[type=submit]"
chromium-cli dom wait ".dashboard"
echo "Logged in!"
```

### Close all GitHub tabs

```bash
chromium-cli find "*github.com*" --json | jq -r '.[].id' | xargs -I{} chromium-cli close {}
```

### Take full-page screenshots of multiple URLs

```bash
urls="github.com google.com example.com"
for url in $urls; do
  chromium-cli go "$url" --wait
  chromium-cli screenshot --full --output "${url//\//_}.png"
done
```

### Monitor network requests

```bash
chromium-cli network start
chromium-cli go api.example.com --wait
chromium-cli network log --json | jq '.[] | {url: .url, status: .status, time: .time}'
chromium-cli network stop
```

### Extract data from page

```bash
# Get all links
chromium-cli dom query "a[href]" --json | jq -r '.[].href'

# Get page title and URL
chromium-cli info

# Get text content
chromium-cli text "article p" --json | jq -r '.[]'
```

## Troubleshooting

### Extension not connecting

1. Verify server is running: `chromium-cli server status`
2. Check extension popup for connection status
3. Reload extension at `chrome://extensions`

### Permission errors

Ensure the extension has all required permissions. Reinstall if needed.

### Port already in use

```bash
# Use different port
chromium-cli --port 8766 server start

# Or set in config
echo "CHROMIUM_CLI_PORT=8766" >> ~/.chromium-cli.conf
```

### Commands timing out

Increase timeout for slow pages:

```bash
chromium-cli --timeout 60000 dom wait ".slow-element"
```

## License

MIT
