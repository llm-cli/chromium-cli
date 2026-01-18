#compdef chromium-cli
# Zsh completion for chromium-cli
# Install: copy to a directory in your fpath, e.g.:
#   cp chromium-cli.zsh ~/.zsh/completions/_chromium-cli
# Or source directly:
#   source /path/to/chromium-cli.zsh

_chromium-cli() {
    local -a commands
    local -a tabs_cmds windows_cmds dom_cmds storage_cmds network_cmds console_cmds groups_cmds server_cmds

    commands=(
        'tabs:Tab management commands'
        'windows:Window management commands'
        'dom:DOM manipulation commands'
        'cookies:Cookie storage commands'
        'localstorage:Local storage commands'
        'sessionstorage:Session storage commands'
        'screenshot:Take screenshots'
        'network:Network request logging'
        'console:Console log capture'
        'groups:Tab group management'
        'server:Server management'
        'discover:Find running servers'
        'go:Navigate current tab to URL'
        'open:Open URL in new tab'
        'wait:Wait for page to load'
        'back:Go back'
        'forward:Go forward'
        'reload:Reload current tab'
        'click:Click element'
        'text:Get element text'
        'html:Get element HTML'
        'fill:Fill input field'
        'type:Type text into element'
        'exec:Execute JavaScript'
        'info:Get page info'
        'exists:Check if element exists'
        'count:Count matching elements'
        'visible:Check if element is visible'
        'ls:List all tabs'
        'close:Close tab'
        'find:Find tabs by pattern'
    )

    tabs_cmds=(
        'list:List all tabs'
        'get:Get tab details'
        'create:Create new tab'
        'close:Close tab(s)'
        'reload:Reload tab'
        'navigate:Navigate tab to URL'
        'activate:Activate/focus tab'
        'find:Find tabs by URL/title'
        'back:Go back'
        'forward:Go forward'
        'pin:Pin tab'
        'unpin:Unpin tab'
        'mute:Mute tab'
        'unmute:Unmute tab'
        'duplicate:Duplicate tab'
        'move:Move tab to index'
        'group:Group tabs'
        'ungroup:Ungroup tabs'
    )

    windows_cmds=(
        'list:List all windows'
        'get:Get window details'
        'create:Create new window'
        'close:Close window'
        'focus:Focus window'
        'minimize:Minimize window'
        'maximize:Maximize window'
        'fullscreen:Fullscreen window'
    )

    dom_cmds=(
        'query:Query elements'
        'text:Get element text'
        'html:Get element HTML'
        'attr:Get element attribute'
        'click:Click element'
        'fill:Fill input'
        'type:Type text'
        'clear:Clear input'
        'scroll:Scroll by offset'
        'scrollTo:Scroll element into view'
        'exec:Execute JavaScript'
        'wait:Wait for element'
        'exists:Check if element exists'
        'count:Count matching elements'
        'visible:Check if visible in viewport'
        'drag:Drag element to target'
        'upload:Upload file to input'
        'frames:List iframes on page'
        'info:Get page info'
    )

    storage_cmds=(
        'list:List all items'
        'get:Get item'
        'set:Set item'
        'delete:Delete item'
        'clear:Clear all items'
    )

    network_cmds=(
        'start:Start request logging'
        'stop:Stop request logging'
        'log:Get request log'
        'stats:Get request stats'
        'clear:Clear log'
    )

    console_cmds=(
        'list:Get captured logs'
        'clear:Clear captured logs'
    )

    groups_cmds=(
        'list:List tab groups'
        'create:Group tabs'
        'update:Update group'
    )

    server_cmds=(
        'start:Start the bridge server'
        'stop:Stop the bridge server'
        'status:Check server status'
    )

    _arguments -C \
        '--port[Server port]:port:' \
        '--browser[Target specific browser]:browser id:' \
        '--tab[Target specific tab]:tab id:' \
        '(-t --timeout)'{-t,--timeout}'[Request timeout in ms]:timeout:' \
        '--frame[Target iframe for DOM commands]:selector:' \
        '--level[Filter console logs by level]:level:(log warn error info debug)' \
        '--json[Output raw JSON]' \
        '(-w --wait)'{-w,--wait}'[Wait for page load after navigation]' \
        '--help[Show help]' \
        '1: :->command' \
        '2: :->subcommand' \
        '*: :->args'

    case $state in
        command)
            _describe -t commands 'chromium-cli command' commands
            ;;
        subcommand)
            case $words[2] in
                tabs)
                    _describe -t commands 'tabs subcommand' tabs_cmds
                    ;;
                windows)
                    _describe -t commands 'windows subcommand' windows_cmds
                    ;;
                dom)
                    _describe -t commands 'dom subcommand' dom_cmds
                    ;;
                cookies|localstorage|sessionstorage)
                    _describe -t commands 'storage subcommand' storage_cmds
                    ;;
                network)
                    _describe -t commands 'network subcommand' network_cmds
                    ;;
                console)
                    _describe -t commands 'console subcommand' console_cmds
                    ;;
                groups)
                    _describe -t commands 'groups subcommand' groups_cmds
                    ;;
                server)
                    _describe -t commands 'server subcommand' server_cmds
                    ;;
                screenshot)
                    _arguments \
                        '--full[Capture full page]' \
                        '--element[Capture element]:selector:' \
                        '--output[Save to file]:file:_files'
                    ;;
            esac
            ;;
        args)
            case $words[2] in
                screenshot)
                    _arguments \
                        '--full[Capture full page]' \
                        '--element[Capture element]:selector:' \
                        '--output[Save to file]:file:_files'
                    ;;
            esac
            ;;
    esac
}

_chromium-cli "$@"
