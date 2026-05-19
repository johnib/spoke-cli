# spoke — Spoke Phone CLI

A GitHub-style command-line interface for [Spoke Phone](https://www.spokephone.com), plus a built-in MCP bridge that exposes the same surface to AI agents like Claude Code.

Built against the Spoke Developer API (OAuth2 client_credentials).

## Quickstart

```bash
# Install (once published)
npm install -g @spoke-phone/cli

# Authenticate
spoke auth login --client-id $SPOKE_CLIENT_ID --client-secret $SPOKE_CLIENT_SECRET

# Verify
spoke auth status

# Browse the directory
spoke directory list
spoke directory list --available
spoke directory get 101
spoke directory search sales

# Manage users / availability
spoke user list --available
spoke user availability 101
spoke user set-availability 101 --status busy

# Call control
spoke call list
spoke call transfer CA1234... --to 101
spoke call transfer CA1234... --to 101 --warm
spoke call hangup CA1234...

# Messaging
spoke message send --to +972501234567 --from 101 --body "Hello"

# Voicemail
spoke voicemail list --unread
spoke voicemail transcript vm_abc123

# Webhooks
spoke webhook create --url https://example.com --events call.started,call.ended
spoke webhook list

# Raw API escape hatch
spoke api /directory
spoke api /webhooks --method POST --field url=https://x --field 'events[]=call.started'

# Start MCP server (stdio transport for Claude Code)
spoke mcp serve
```

## Authentication

Spoke uses OAuth2 client_credentials. Credentials are stored at `~/.spoke/config.yml`
with mode `0600` (owner read/write only). Tokens are cached per-profile in
`~/.spoke/tokens/<profile>.json` and refreshed automatically when they expire.

Override the active profile per-invocation with `--profile <name>` or globally with
the `SPOKE_PROFILE` env var.

### Headless / CI

```bash
export SPOKE_CLIENT_ID=...
export SPOKE_CLIENT_SECRET=...
spoke directory list --available
```

No `auth login` needed — env credentials are picked up automatically. Tokens are
NOT cached to disk in this ephemeral mode.

## Output Formats

| Flag | Behavior |
|---|---|
| (default) for lists | Aligned ASCII table |
| (default) for single items | Human key:value view |
| `--json` | Pretty-printed JSON |
| `--jq <expr>` | JSONata expression (jq-compatible for simple uses) |
| `--template <tmpl>` | Go-style `text/template` rendering |
| `--silent`, `-s` | Suppress stdout (errors still on stderr) |

```bash
spoke directory list --json | jq '.[] | .extension'
spoke directory list --jq '$.extension'
spoke directory list --template '{{range .}}{{.extension}} - {{.displayName}}\n{{end}}'
```

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | General error / validation failure |
| `2` | Authentication error |
| `3` | Resource not found (HTTP 404) |
| `4` | Permission denied (HTTP 403) |
| `5` | Rate limited (HTTP 429) |
| `6` | Server-side error (HTTP 5xx) |

## MCP Bridge

Every CLI command is exposed as an MCP tool. To wire into Claude Code, add to
your `.mcp.json`:

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

Available tools: `spoke_directory_list`, `spoke_directory_get`,
`spoke_user_availability`, `spoke_group_availability`, `spoke_group_members`,
`spoke_call_transfer`, `spoke_call_twiml_url`, `spoke_message_send`,
`spoke_webhook_list`, `spoke_api`.

## Development

```bash
npm install
npm run build      # tsc
npm test           # 260+ tests
npm run test:cov   # with coverage report at coverage/lcov-report/index.html
npm run lint
```

Architecture:
- `src/commands/` — one file per CLI subcommand
- `src/lib/api/` — thin axios-based wrappers per resource
- `src/lib/auth/` — OAuth2 client_credentials + token caching
- `src/lib/output/` — table, human, JSON, JSONata (`--jq`), template renderers
- `src/mcp/` — MCP server that wraps the API client as tools

All HTTP is mocked in tests via [nock](https://github.com/nock/nock). No real
network is touched by the test suite.

## License

MIT
