# spoke — Spoke Phone CLI

A GitHub-style command-line interface for [Spoke Phone](https://www.spokephone.com), plus a built-in MCP bridge that exposes the same surface to AI agents like Claude Code.

Built against the [Spoke Developer API](https://developer.spokephone.com/) (OAuth2 client_credentials).

## Quickstart

```bash
# Install (once published)
npm install -g @spoke-phone/cli

# Authenticate
spoke auth login --client-id $SPOKE_CLIENT_ID --client-secret $SPOKE_CLIENT_SECRET

# Or use env vars (no profile written)
export SPOKE_CLIENT_ID=...
export SPOKE_CLIENT_SECRET=...

# Verify
spoke auth status

# Browse
spoke directory list
spoke directory get 1053          # by extension
spoke directory get "Alice Cohen" # by name
spoke directory search sales

# Users
spoke user list --available
spoke user availability 1053
spoke user redirect-url 1053

# Teams (call groups)
spoke group list
spoke group members 1048
spoke group availability 1048

# Calls
spoke call list
spoke call get <call-id>
spoke call twiml-url --extension 1053 --organisation-id <org-id>

# Voicemails (derived view over /calls)
spoke voicemail list
spoke voicemail transcript <call-id>
spoke voicemail download <call-id> --output vm.wav

# Outbound SMS
spoke message send --to +1... --from 1053 --body "Hello"

# Webhooks
spoke webhook list
spoke webhook create --url https://x --events call.started,call.ended

# Raw API escape hatch
spoke api /directory --jq '$.entries.extension'
spoke api /calls?limit=5 --json

# MCP for Claude Code
spoke mcp serve
```

## Command surface

The CLI mirrors what the public Spoke API actually exposes. Operations that
exist only in Spoke's own clients (e.g. setting your own availability,
transferring live calls, listing inbound messages) are **not** in the CLI —
they aren't in the public API either.

| Resource | Commands |
|---|---|
| `auth` | login, logout, status, token, profiles |
| `directory` | list, get, search |
| `user` | list, get, availability, redirect-url |
| `group` (team) | list, get, members, availability, redirect-url |
| `device` | list, get |
| `call` | list, get, twiml-url |
| `message` | send (the API has no read endpoint — subscribe to `conversation.message.created` webhook) |
| `voicemail` | list, get, transcript, download (derived from `/calls`) |
| `webhook` | list, create, delete, forward |
| `config` | get, set, list |
| `api` | raw HTTP passthrough — `--method`, `--field`, `--header`, `--input`, `--paginate`, `--include` |
| `mcp` | serve — start the MCP bridge |

## Authentication

OAuth2 client_credentials. Credentials are stored at `~/.spoke/config.yml` (mode
`0600`). Tokens cache at `~/.spoke/tokens/<profile>.json`, auto-refreshed.

Override per-invocation with `--profile <name>` or `SPOKE_PROFILE` env var.

## Output formats

| Flag | Behavior |
|---|---|
| (default) for lists | Aligned ASCII table |
| (default) for single items | Human key:value view |
| `--json` | Pretty-printed JSON |
| `--jq <expr>` | JSONata expression (jq-compatible for simple uses) |
| `--template <tmpl>` | Go-style `text/template` rendering |
| `--silent`, `-s` | Suppress stdout (errors still on stderr) |

```bash
spoke directory list --jq '$.extension'
spoke call list --template '{{range .}}{{.id}} {{.direction}}\n{{end}}'
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Generic / validation failure |
| `2` | Authentication error |
| `3` | Resource not found (HTTP 404) |
| `4` | Permission denied (HTTP 403) |
| `5` | Rate limited (HTTP 429) |
| `6` | Server-side error (HTTP 5xx) |

## MCP bridge

Wire into Claude Code via `.mcp.json`:

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

Tools exposed: `spoke_directory_list`, `spoke_directory_get`,
`spoke_user_availability`, `spoke_group_availability`, `spoke_group_members`,
`spoke_call_list`, `spoke_call_get`, `spoke_voicemail_list`,
`spoke_message_send`, `spoke_webhook_list`, `spoke_api`.

## API quirks worth knowing

The CLI handles these for you; documenting them in case you reach for `spoke api`.

- **Extension lookup is a query param, not a path:** `GET /directory?extension=1053`. The path-style `/directory/{id}` only accepts UUIDs.
- **Type discriminator is `"team"`**, not `callGroup`. Member list is `teamMembers`.
- **`Call.duration` is milliseconds**, but `Recording.duration` and `Voicemail.duration` are seconds.
- **`/conversationMessages` is POST-only.** There is no GET. To receive messages, subscribe to the `conversation.message.created` webhook.
- **`/voicemails` does not exist as a resource.** Voicemails are a `.voicemail` field nested on Call objects; `spoke voicemail *` projects over `/calls`.
- **Voicemail recording URLs are signed and expire 6h after recording.** Re-fetch the call to refresh.
- **`/telephony/redirect` is a TwiML URL** that Twilio fetches when it routes a call — it's not a Spoke REST endpoint. Spoke's public API has no call-transfer / call-hangup endpoints. Use `spoke call twiml-url` to build the URL for your Twilio integration.
- **Default `limit=100`, max `1000`.** Pagination is cursor-based: `meta.next` carries the next token, pass back as `?next=<token>`.
- **Webhook signature:** `x-spoke-signature: sha256=<HMAC>` of `${ms_timestamp}.${body}`, 5-min window.

## Development

```bash
npm install
npm run build
npm test
npm run test:cov
npm run lint
```

Architecture:
- `src/commands/` — one file per CLI subcommand
- `src/lib/api/` — typed wrappers per Spoke resource
- `src/lib/auth/` — OAuth2 + token cache
- `src/lib/output/` — table / human / JSON / JSONata / template renderers
- `src/mcp/` — MCP server wrapping the API client

All HTTP is mocked via [nock](https://github.com/nock/nock) in tests. No real
network is touched by the test suite.

## License

MIT
