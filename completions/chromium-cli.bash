# Bash completion for chromium-cli
# Source this file or add to ~/.bashrc:
#   source /path/to/chromium-cli.bash
# Or copy to /etc/bash_completion.d/

_chromium_cli() {
    local cur prev words cword
    _init_completion || return

    local commands="tabs windows dom cookies localstorage sessionstorage screenshot network console groups server discover go open wait back forward reload click text html fill type exec info exists count visible ls close find"

    local tabs_subcmds="list get create close reload navigate activate find back forward pin unpin mute unmute duplicate move group ungroup"
    local windows_subcmds="list get create close focus minimize maximize fullscreen"
    local dom_subcmds="query text html attr click fill type clear scroll scrollTo exec wait exists count visible drag upload frames info"
    local storage_subcmds="list get set delete clear"
    local screenshot_opts="--full --element --output"
    local network_subcmds="start stop log stats clear"
    local console_subcmds="list clear"
    local groups_subcmds="list create update"
    local server_subcmds="start stop status"
    local global_opts="--port --browser --tab --timeout -t --frame --level --json --wait -w --help"

    # First argument: main command
    if [[ $cword -eq 1 ]]; then
        COMPREPLY=($(compgen -W "$commands" -- "$cur"))
        return
    fi

    # Second argument: subcommand based on first
    case "${words[1]}" in
        tabs)
            if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$tabs_subcmds" -- "$cur"))
            fi
            ;;
        windows)
            if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$windows_subcmds" -- "$cur"))
            fi
            ;;
        dom)
            if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$dom_subcmds" -- "$cur"))
            fi
            ;;
        cookies|localstorage|sessionstorage)
            if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$storage_subcmds" -- "$cur"))
            fi
            ;;
        screenshot)
            COMPREPLY=($(compgen -W "$screenshot_opts" -- "$cur"))
            ;;
        network)
            if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$network_subcmds" -- "$cur"))
            fi
            ;;
        console)
            if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$console_subcmds" -- "$cur"))
            fi
            ;;
        groups)
            if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$groups_subcmds" -- "$cur"))
            fi
            ;;
        server)
            if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$server_subcmds" -- "$cur"))
            fi
            ;;
        *)
            # Global options for shortcuts and other commands
            if [[ "$cur" == -* ]]; then
                COMPREPLY=($(compgen -W "$global_opts" -- "$cur"))
            fi
            ;;
    esac

    # Handle options with arguments
    case "$prev" in
        --port|--browser|--tab|--timeout|-t)
            # Expect a value, no completion
            return
            ;;
        --output)
            # File completion
            _filedir
            return
            ;;
        --element)
            # Expect a selector, no completion
            return
            ;;
    esac
}

complete -F _chromium_cli chromium-cli
