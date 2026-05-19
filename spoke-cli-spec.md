# spoke — Spoke Phone CLI Specification

> A command-line interface for Spoke Phone, modeled after the GitHub CLI (`gh`).
> Built on the Spoke Developer API (OAuth2 client_credentials).
> Binary name: `spoke`

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Installation](#installation)
3. [Authentication](#authentication)
4. [Global Flags](#global-flags)
5. [Command Reference](#command-reference)
   - [spoke auth](#spoke-auth)
   - [spoke directory](#spoke-directory)
   - [spoke user](#spoke-user)
   - [spoke group](#spoke-group)
   - [spoke device](#spoke-device)
   - [spoke call](#spoke-call)
   - [spoke message](#spoke-message)
   - [spoke voicemail](#spoke-voicemail)
   - [spoke webhook](#spoke-webhook)
   - [spoke api](#spoke-api)
   - [spoke config](#spoke-config)
6. [Config File](#config-file)
7. [Environment Variables](#environment-variables)
8. [Output Formats](#output-formats)
9. [Exit Codes](#exit-codes)
10. [Error Handling](#error-handling)
11. [Tech Stack](#tech-stack)
12. [Project Structure](#project-structure)
13. [MCP Bridge](#mcp-bridge)

---

## Design Principles

Modeled after `gh` (GitHub CLI). Every decision defers to these rules:

1. **Noun → Verb** command shape: `spoke <resource> <action>`
2. **Human output by default**, JSON with `--json`, table with `--table`
3. **`--help` on every command**, short aliases where obvious
4. **Piping first-class**: output is clean, parseable, grep-friendly
5. **Auth is stored once** in `~/.spoke/config.yml`, not re-entered per call
6. **`spoke api`** is the escape hatch — raw HTTP for anything not yet modeled
7. **Dry-run support** on all write operations via `--dry-run`
8. **Idempotent** where possible; warnings on destructive actions

---

## Installation

```bash
# Homebrew (macOS / Linux)
brew install spoke-phone/tap/spoke

# npm (global)
npm install -g @spoke-phone/cli

# npx (no install)
npx @spoke-phone/cli <command>

# Docker
docker run --rm -v ~/.spoke:/root/.spoke spoke-phone/cli <command>
```

---

## Authentication

Spoke uses OAuth2 **client_credentials** flow. No user login — machine-to-machine.

```
Token endpoint:  https://auth.spokephone.com/oauth/token
API base:        https://integration.spokephone.com
```

Tokens are short-lived and auto-refreshed transparently by the CLI.

---

## Global Flags

Available on every command:

| Flag | Short | Description |
|---|---|---|
| `--help` | `-h` | Show help for command |
| `--json` | | Output raw JSON |
| `--table` | | Output as aligned table (default for lists) |
| `--jq <expr>` | | Filter JSON output with jq expression |
| `--template <tmpl>` | | Go-style template for output formatting |
| `--no-color` | | Disable ANSI color output |
| `--silent` | `-s` | Suppress all output except errors |
| `--dry-run` | | Print what would happen; make no API calls |
| `--profile <name>` | `-p` | Use a named auth profile |
| `--verbose` | `-v` | Print HTTP request/response details |

---

## Command Reference

---

### `spoke auth`

Manage authentication and credentials.

```
spoke auth <subcommand>
```

#### `spoke auth login`

Store credentials for a Spoke account.

```bash
spoke auth login
# Interactive prompts:
# > Spoke Client ID:    ****
# > Spoke Client Secret: ****
# > Profile name [default]:

spoke auth login --client-id $ID --client-secret $SECRET
spoke auth login --client-id $ID --client-secret $SECRET --profile prod
```

Writes to `~/.spoke/config.yml`. Immediately validates credentials by fetching a token.

#### `spoke auth logout`

```bash
spoke auth logout
spoke auth logout --profile prod
```

#### `spoke auth status`

```bash
spoke auth status
# Output:
# ✓ Logged in to integration.spokephone.com (profile: default)
#   Token: valid (expires in 47m)
#   Account: Nayax (tenant: nayax-prod)

spoke auth status --show-token   # reveals raw access token
```

#### `spoke auth token`

Print the current bearer token (useful for curl / other tools).

```bash
spoke auth token
# eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# Pipe directly into curl:
curl -H "Authorization: Bearer $(spoke auth token)" \
  https://integration.spokephone.com/directory
```

#### `spoke auth profiles`

List all saved profiles.

```bash
spoke auth profiles
# NAME      TENANT          STATUS
# default   nayax-prod      active
# staging   nayax-staging   valid
```

---

### `spoke directory`

Browse and search the unified Spoke directory (users + groups + devices).

```
spoke directory <subcommand>
```

#### `spoke directory list`

```bash
spoke directory list
# Lists all directory entries (paginated)

spoke directory list --type user
spoke directory list --type group
spoke directory list --type device
spoke directory list --available          # only entries currently available
spoke directory list --hidden             # include hidden entries
spoke directory list --page 2 --limit 50
spoke directory list --json
spoke directory list --json | jq '.[].extension'
```

**Example output (default table):**
```
EXTENSION  NAME              TYPE    STATUS     DEVICES
101        Alice Cohen       user    available  2
102        Bob Levi          user    busy        1
103        Sales Team        group   available  5 members
104        Reception Desk    device  available  -
```

#### `spoke directory get`

Get a single directory entry by extension.

```bash
spoke directory get 101
spoke directory get 101 --json
spoke directory get sales          # fuzzy name match
```

**Example output:**
```
Extension:   101
Name:        Alice Cohen
Type:        user
Status:      available
Devices:     iPhone (active), MacBook (idle)
Groups:      Sales Team, Support
TwiML URL:   https://...
```

#### `spoke directory search`

```bash
spoke directory search "alice"
spoke directory search "sales" --type group
spoke directory search --available --type user
```

---

### `spoke user`

Manage Spoke users and their availability/presence.

```
spoke user <subcommand>
```

#### `spoke user list`

```bash
spoke user list
spoke user list --available
spoke user list --json
spoke user list --json | jq '.[] | select(.status == "available") | .name'
```

#### `spoke user get`

```bash
spoke user get 101
spoke user get alice.cohen          # by name slug
spoke user get --me                 # current API credential's user
```

#### `spoke user availability`

Check real-time availability of a user.

```bash
spoke user availability 101
# Alice Cohen (ext 101): available
# Devices: iPhone ✓  MacBook ✓

spoke user availability 101 --watch   # poll every 5s, update in place
```

#### `spoke user set-availability`

```bash
spoke user set-availability 101 --status available
spoke user set-availability 101 --status busy
spoke user set-availability 101 --status unavailable
```

#### `spoke user redirect-url`

Get the TwiML redirect URL for a user (used in Twilio Studio flows).

```bash
spoke user redirect-url 101
# https://spoke-api-service-xxxx.twil.io/redirect?ext=101

spoke user redirect-url 101 --return-to https://my-studio-flow.twil.io/fallback
```

---

### `spoke group`

Manage call groups (hunt groups / teams).

```
spoke group <subcommand>
```

#### `spoke group list`

```bash
spoke group list
spoke group list --available          # groups with at least 1 available member
spoke group list --hidden             # include hidden groups
spoke group list --json
```

**Example output:**
```
EXTENSION  NAME          MEMBERS  AVAILABLE  ROUTING
200        Sales         6        4          round-robin
201        Support       8        8          fixed-order
202        Finance       3        0          skills-based
```

#### `spoke group get`

```bash
spoke group get 200
spoke group get sales
```

**Example output:**
```
Extension:  200
Name:       Sales
Members:    6 (4 available)
Routing:    round-robin
Voicemail:  enabled
Hidden:     false
TwiML URL:  https://...
```

#### `spoke group members`

```bash
spoke group members 200
# Lists all members of the group with their availability

spoke group members 200 --available    # only available members
spoke group members 200 --json
```

#### `spoke group availability`

```bash
spoke group availability 200
# Sales (ext 200): 4/6 members available
# Alice Cohen   101  available
# Bob Levi      102  busy
# Carol Abrams  103  available
# ...

spoke group availability 200 --watch
```

#### `spoke group redirect-url`

```bash
spoke group redirect-url 200
spoke group redirect-url 200 --return-to https://fallback.twil.io
```

---

### `spoke device`

Manage registered devices.

```
spoke device <subcommand>
```

#### `spoke device list`

```bash
spoke device list
spoke device list --user 101
spoke device list --type mobile        # mobile | desktop | deskphone
spoke device list --active             # only devices currently registered
spoke device list --json
```

**Example output:**
```
ID          USER         TYPE     PLATFORM  STATUS
dev_abc123  Alice Cohen  mobile   iOS       active
dev_def456  Alice Cohen  desktop  macOS     idle
dev_ghi789  Bob Levi     mobile   Android   active
```

#### `spoke device get`

```bash
spoke device get dev_abc123
```

---

### `spoke call`

Call control — transfer, redirect, and inspect live calls.

> Note: Spoke uses Twilio Agent Conference under the hood.
> All call control goes via TwiML/REST. These commands wrap those flows.

```
spoke call <subcommand>
```

#### `spoke call list`

List active calls on the account.

```bash
spoke call list
spoke call list --json
```

**Example output:**
```
SID                  FROM         TO          STATUS   DURATION
CA1234...            +972501234   ext 101     in-call  00:02:14
CA5678...            ext 200      +1415555    ringing  00:00:08
```

#### `spoke call get`

```bash
spoke call get CA1234567890abcdef
```

#### `spoke call transfer`

Transfer an active call to a user or group.

```bash
spoke call transfer CA1234... --to 101                  # blind transfer to ext 101
spoke call transfer CA1234... --to 200 --warm           # warm/consult transfer
spoke call transfer CA1234... --to +972501234567        # transfer to PSTN number
spoke call transfer CA1234... --to 101 --warm --announce "Customer asking about invoice"
```

#### `spoke call redirect`

Redirect an unanswered or queued call to a Spoke extension.

```bash
spoke call redirect CA1234... --to 101
spoke call redirect CA1234... --to 200
```

#### `spoke call hangup`

```bash
spoke call hangup CA1234...
```

#### `spoke call twiml-url`

Generate a TwiML redirect URL for use in Twilio Studio / Functions.

```bash
spoke call twiml-url --extension 101
spoke call twiml-url --extension 200 --return-to https://studio.twil.io/fallback
# Output: https://spoke-api-service-xxxx.twil.io/redirect?ext=101&returnTo=...
```

---

### `spoke message`

Send and inspect SMS / WhatsApp messages.

```
spoke message <subcommand>
```

#### `spoke message list`

```bash
spoke message list
spoke message list --direction inbound
spoke message list --direction outbound
spoke message list --user 101
spoke message list --channel sms
spoke message list --channel whatsapp
spoke message list --since "2024-01-01"
spoke message list --json
```

#### `spoke message get`

```bash
spoke message get MSG_abc123
```

#### `spoke message send`

```bash
spoke message send --to +972501234567 --from 101 --body "Your appointment is confirmed"
spoke message send --to +972501234567 --from 101 --channel whatsapp --body "Hello via WhatsApp"
spoke message send --to +972501234567 --from 101 --body "$(cat message.txt)"
```

---

### `spoke voicemail`

Access and manage voicemails.

```
spoke voicemail <subcommand>
```

#### `spoke voicemail list`

```bash
spoke voicemail list
spoke voicemail list --user 101
spoke voicemail list --group 200
spoke voicemail list --unread
spoke voicemail list --json
```

**Example output:**
```
ID          RECIPIENT     FROM           DURATION  RECEIVED          READ
vm_abc123   Alice (101)   +19175551234   00:43     2024-05-19 09:14  no
vm_def456   Sales (200)   +12125559876   01:12     2024-05-19 08:52  yes
```

#### `spoke voicemail get`

```bash
spoke voicemail get vm_abc123
# Shows metadata + transcription if available
```

#### `spoke voicemail transcript`

```bash
spoke voicemail transcript vm_abc123
# "Hi Alice, this is John from Acme calling about the renewal quote..."
```

#### `spoke voicemail download`

```bash
spoke voicemail download vm_abc123
spoke voicemail download vm_abc123 --output ./voicemail.mp3
```

---

### `spoke webhook`

Manage event subscriptions (real-time Spoke events delivered to your endpoint).

```
spoke webhook <subcommand>
```

#### `spoke webhook list`

```bash
spoke webhook list
```

**Example output:**
```
ID           URL                                EVENTS                     STATUS
wh_abc123    https://my-server.com/spoke        call.started,call.ended    active
wh_def456    https://my-server.com/voicemail    voicemail.received         active
```

#### `spoke webhook create`

```bash
spoke webhook create \
  --url https://my-server.com/spoke \
  --events call.started,call.ended,call.transferred

spoke webhook create \
  --url https://my-server.com/voicemail \
  --events voicemail.received \
  --secret my-signing-secret
```

**Supported event types:**
```
call.started
call.answered
call.ended
call.transferred
call.missed
call.voicemail
message.received
message.sent
user.availability.changed
group.availability.changed
```

#### `spoke webhook delete`

```bash
spoke webhook delete wh_abc123
spoke webhook delete wh_abc123 --confirm
```

#### `spoke webhook forward`

Local development helper — forward webhook events to localhost using an ngrok-style tunnel.

```bash
spoke webhook forward --port 3000
# Starts tunnel, registers temporary webhook, streams events to your local server
# Press Ctrl+C to stop and deregister

spoke webhook forward --port 3000 --events call.started,call.ended
```

#### `spoke webhook replay`

```bash
spoke webhook replay wh_abc123 --event-id evt_xyz
```

---

### `spoke api`

Make authenticated HTTP requests directly to the Spoke API.
The escape hatch for anything not yet modeled in the CLI.

```
spoke api <endpoint> [flags]
```

```bash
# GET
spoke api /directory
spoke api /directory?page=2&limit=50
spoke api /directory/101

# POST
spoke api /webhooks \
  --method POST \
  --field url=https://my-server.com/events \
  --field events[]=call.started

# PATCH
spoke api /users/101 \
  --method PATCH \
  --field status=available

# DELETE
spoke api /webhooks/wh_abc123 --method DELETE

# Pipe to jq
spoke api /directory | jq '.entries[] | {ext: .extension, name: .displayName}'

# Paginate all pages automatically
spoke api /directory --paginate

# Include response headers
spoke api /directory --include
```

**Flags:**
| Flag | Description |
|---|---|
| `--method <METHOD>` | HTTP method (default: GET) |
| `--field <key=value>` | Add JSON body field (repeatable) |
| `--header <key:value>` | Add request header (repeatable) |
| `--input <file>` | Read request body from file or stdin (`-`) |
| `--paginate` | Fetch all pages, merge results |
| `--include` | Include response headers in output |
| `--silent` | No output, only exit code |

---

### `spoke config`

Manage CLI configuration.

```
spoke config <subcommand>
```

#### `spoke config get`

```bash
spoke config get api_url
spoke config get default_profile
```

#### `spoke config set`

```bash
spoke config set api_url https://integration.spokephone.com
spoke config set default_profile prod
spoke config set output_format json      # json | table | human
spoke config set color false
```

#### `spoke config list`

```bash
spoke config list
# api_url          = https://integration.spokephone.com
# auth_url         = https://auth.spokephone.com/oauth/token
# default_profile  = default
# output_format    = table
# color            = true
```

---

## Config File

Stored at `~/.spoke/config.yml`.

```yaml
# ~/.spoke/config.yml

version: 1
default_profile: default
output_format: table
color: true

profiles:
  default:
    client_id: abc123
    client_secret: "enc:AQICAHh..."   # encrypted at rest
    api_url: https://integration.spokephone.com
    auth_url: https://auth.spokephone.com/oauth/token
    tenant: nayax-prod

  staging:
    client_id: xyz789
    client_secret: "enc:AQICAHh..."
    api_url: https://integration.spokephone.com
    auth_url: https://auth.spokephone.com/oauth/token
    tenant: nayax-staging
```

Token cache stored separately at `~/.spoke/tokens/<profile>.json`.

---

## Environment Variables

Override any config value via env vars. Takes priority over config file.

| Variable | Description |
|---|---|
| `SPOKE_CLIENT_ID` | OAuth2 Client ID |
| `SPOKE_CLIENT_SECRET` | OAuth2 Client Secret |
| `SPOKE_API_URL` | API base URL (default: `https://integration.spokephone.com`) |
| `SPOKE_AUTH_URL` | Token endpoint (default: `https://auth.spokephone.com/oauth/token`) |
| `SPOKE_PROFILE` | Active profile name |
| `SPOKE_OUTPUT_FORMAT` | `json`, `table`, or `human` |
| `NO_COLOR` | Disable color output (standard) |

CI/CD usage:
```bash
export SPOKE_CLIENT_ID=abc123
export SPOKE_CLIENT_SECRET=secret

spoke directory list --available
spoke user availability 101
```

---

## Output Formats

### Human (default for single items)
```
Extension:  101
Name:       Alice Cohen
Status:     available
Devices:    2 active
```

### Table (default for lists)
```
EXTENSION  NAME          STATUS     DEVICES
101        Alice Cohen   available  2
102        Bob Levi      busy        1
```

### JSON (`--json`)
```json
[
  {
    "extension": "101",
    "displayName": "Alice Cohen",
    "status": "available",
    "type": "user",
    "devices": [...]
  }
]
```

### JQ filter (`--jq`)
```bash
spoke directory list --json --jq '.[].extension'
# 101
# 102
# 103
```

### Template (`--template`)
```bash
spoke directory list --template '{{range .}}{{.extension}} - {{.displayName}}{{"\n"}}{{end}}'
# 101 - Alice Cohen
# 102 - Bob Levi
```

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | General error |
| `2` | Authentication error (invalid/expired credentials) |
| `3` | Not found (404) |
| `4` | Permission denied (403) |
| `5` | Rate limited (429) |
| `6` | API error (5xx) |

---

## Error Handling

```bash
spoke user get 999
# Error: extension 999 not found (404)
# Run `spoke directory list` to see available extensions.

spoke auth status
# Error: credentials invalid or expired
# Run `spoke auth login` to re-authenticate.

spoke call transfer CA123 --to 101
# Warning: extension 101 is currently busy (0 devices available)
# Transfer anyway? [y/N]:
```

Errors always go to stderr. Exit code is always non-zero on failure.
`--silent` suppresses stdout but never suppresses errors.

---

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Language | TypeScript / Node.js | Same stack as Spoke's own repo; native npm distribution |
| CLI framework | [oclif](https://oclif.io) | Same framework used by Heroku CLI, Twilio CLI |
| HTTP client | axios | Already used in spoke-ph/twilio-runtime-spoke-api |
| Auth / token cache | Custom OAuth2 client_credentials handler | Lightweight, no extra deps |
| Output / tables | [cli-table3](https://github.com/cli-table3/cli-table3) + chalk | Clean table rendering with color |
| Config encryption | keytar (OS keychain) or AES-256 | Protect client_secret at rest |
| Testing | Jest + nock (HTTP mocking) | Already in Spoke's repo |
| Distribution | npm + Homebrew tap | Matches Twilio CLI distribution model |

---

## Project Structure

```
spoke-cli/
├── src/
│   ├── commands/
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   ├── status.ts
│   │   │   ├── token.ts
│   │   │   └── profiles.ts
│   │   ├── directory/
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   └── search.ts
│   │   ├── user/
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   ├── availability.ts
│   │   │   ├── set-availability.ts
│   │   │   └── redirect-url.ts
│   │   ├── group/
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   ├── members.ts
│   │   │   ├── availability.ts
│   │   │   └── redirect-url.ts
│   │   ├── device/
│   │   │   ├── list.ts
│   │   │   └── get.ts
│   │   ├── call/
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   ├── transfer.ts
│   │   │   ├── redirect.ts
│   │   │   ├── hangup.ts
│   │   │   └── twiml-url.ts
│   │   ├── message/
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   └── send.ts
│   │   ├── voicemail/
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   ├── transcript.ts
│   │   │   └── download.ts
│   │   ├── webhook/
│   │   │   ├── list.ts
│   │   │   ├── create.ts
│   │   │   ├── delete.ts
│   │   │   ├── forward.ts
│   │   │   └── replay.ts
│   │   ├── api.ts
│   │   └── config/
│   │       ├── get.ts
│   │       ├── set.ts
│   │       └── list.ts
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── oauth.ts          # client_credentials token flow
│   │   │   ├── token-cache.ts    # read/write ~/.spoke/tokens/
│   │   │   └── profiles.ts       # read/write ~/.spoke/config.yml
│   │   ├── api/
│   │   │   ├── client.ts         # axios instance, auto-refresh token
│   │   │   ├── directory.ts      # Directory API methods
│   │   │   ├── users.ts
│   │   │   ├── groups.ts
│   │   │   ├── devices.ts
│   │   │   ├── calls.ts
│   │   │   ├── messages.ts
│   │   │   ├── voicemails.ts
│   │   │   └── webhooks.ts
│   │   ├── output/
│   │   │   ├── table.ts          # cli-table3 helpers
│   │   │   ├── json.ts           # jq / template rendering
│   │   │   └── human.ts          # key-value human output
│   │   └── errors.ts             # typed error classes + exit codes
│   └── index.ts                  # oclif entrypoint
├── test/
│   ├── commands/
│   └── lib/
├── bin/
│   └── spoke                     # shebang entrypoint
├── package.json
├── tsconfig.json
└── README.md
```

---

## MCP Bridge

The CLI doubles as an MCP server entrypoint. A thin adapter layer wraps every
`spoke` command as an MCP tool, enabling Claude Code to call the same API
surface natively.

```bash
# Start MCP server (stdio transport — for Claude Code .mcp.json)
spoke mcp serve

# Start MCP server (HTTP/SSE transport — for claude.ai remote connector)
spoke mcp serve --transport http --port 4000
```

### `.mcp.json` entry (Claude Code)

```json
{
  "mcpServers": {
    "spoke": {
      "command": "npx",
      "args": ["@spoke-phone/cli", "mcp", "serve"],
      "env": {
        "SPOKE_CLIENT_ID": "${SPOKE_CLIENT_ID}",
        "SPOKE_CLIENT_SECRET": "${SPOKE_CLIENT_SECRET}"
      }
    }
  }
}
```

### Exposed MCP tools (auto-generated from commands)

| MCP Tool | Maps to CLI command |
|---|---|
| `spoke_directory_list` | `spoke directory list` |
| `spoke_directory_get` | `spoke directory get <ext>` |
| `spoke_user_availability` | `spoke user availability <ext>` |
| `spoke_group_availability` | `spoke group availability <ext>` |
| `spoke_group_members` | `spoke group members <ext>` |
| `spoke_call_transfer` | `spoke call transfer <sid> --to <ext>` |
| `spoke_call_twiml_url` | `spoke call twiml-url --extension <ext>` |
| `spoke_message_send` | `spoke message send` |
| `spoke_webhook_list` | `spoke webhook list` |
| `spoke_api` | `spoke api <endpoint>` |

This means: **one codebase, two interfaces** — human CLI and AI agent MCP tool.

---

## Quick Reference Card

```
spoke auth login                         Authenticate
spoke auth status                        Check credentials
spoke auth token                         Print bearer token

spoke directory list                     List all entries
spoke directory list --available         Only available
spoke directory get 101                  Get extension 101
spoke directory search "sales"           Fuzzy search

spoke user availability 101              Is ext 101 free?
spoke user availability 101 --watch      Live poll
spoke user redirect-url 101              Get TwiML URL

spoke group list --available             Available groups
spoke group members 200                  Who's in Sales?
spoke group availability 200             How many are free?

spoke call list                          Active calls
spoke call transfer CA123 --to 101       Blind transfer
spoke call transfer CA123 --to 101 --warm  Consult transfer
spoke call twiml-url --extension 200     Studio redirect URL

spoke message send \
  --to +972501234567 \
  --from 101 \
  --body "Hello"                         Send SMS

spoke voicemail list --unread            Unread voicemails
spoke voicemail transcript vm_abc        Read transcription

spoke webhook forward --port 3000        Dev: local tunneling

spoke api /directory                     Raw API GET
spoke api /users/101 --method PATCH \
  --field status=available               Raw API PATCH

spoke mcp serve                          Start MCP server
```
