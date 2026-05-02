import { describe, it, expect } from 'vitest'
import {
  parseMcpInput,
  parseJsonConfig,
  parseCommandLine,
  parseUrl,
  splitCommandLine,
  sanitizeName,
  ensureUniqueName,
} from './mcpParser'

describe('mcpParser', () => {
  // ─── splitCommandLine ───
  describe('splitCommandLine', () => {
    it('splits simple command', () => {
      expect(splitCommandLine('npx -y @anthropic/mcp-server')).toEqual([
        'npx', '-y', '@anthropic/mcp-server',
      ])
    })

    it('handles double-quoted args', () => {
      expect(splitCommandLine('node "path with spaces" --flag')).toEqual([
        'node', 'path with spaces', '--flag',
      ])
    })

    it('handles single-quoted args', () => {
      expect(splitCommandLine("echo 'hello world'")).toEqual([
        'echo', 'hello world',
      ])
    })

    it('handles multiple spaces', () => {
      expect(splitCommandLine('npx   -y   pkg')).toEqual([
        'npx', '-y', 'pkg',
      ])
    })
  })

  // ─── sanitizeName ───
  describe('sanitizeName', () => {
    it('removes @ prefix from scoped packages', () => {
      expect(sanitizeName('@anthropic/mcp-server')).toBe('anthropic-mcp-server')
    })

    it('converts slashes to hyphens', () => {
      expect(sanitizeName('scope/pkg')).toBe('scope-pkg')
    })

    it('converts dots to hyphens and removes other non-alphanumeric', () => {
      expect(sanitizeName('my.server!')).toBe('my-server')
    })

    it('trims leading/trailing hyphens', () => {
      expect(sanitizeName('-my-server-')).toBe('my-server')
    })

    it('returns fallback for empty result', () => {
      expect(sanitizeName('!!!')).toBe('unnamed-server')
    })
  })

  // ─── ensureUniqueName ───
  describe('ensureUniqueName', () => {
    it('returns original if unique', () => {
      expect(ensureUniqueName('my-server', ['other'])).toBe('my-server')
    })

    it('appends -2 if name exists', () => {
      expect(ensureUniqueName('my-server', ['my-server'])).toBe('my-server-2')
    })

    it('increments suffix until unique', () => {
      expect(ensureUniqueName('my-server', ['my-server', 'my-server-2', 'my-server-3'])).toBe('my-server-4')
    })
  })

  // ─── parseJsonConfig ───
  describe('parseJsonConfig', () => {
    it('parses mcpServers format', () => {
      const json = {
        mcpServers: {
          filesystem: { command: 'npx', args: ['-y', '@anthropic/fs'] },
          github: { command: 'npx', args: ['-y', '@anthropic/gh'] },
        },
      }
      const result = parseJsonConfig(json)
      expect(result.success).toBe(true)
      expect(result.servers).toHaveLength(2)
      expect(result.servers[0].name).toBe('filesystem')
      expect(result.servers[0].config.command).toBe('npx')
    })

    it('parses name-wrapped format', () => {
      const json = {
        'my-server': { command: 'npx', args: ['-y', 'pkg'] },
        'other-server': { url: 'https://api.example.com/sse' },
      }
      const result = parseJsonConfig(json)
      expect(result.success).toBe(true)
      expect(result.servers).toHaveLength(2)
      expect(result.servers[0].name).toBe('my-server')
      expect(result.servers[1].name).toBe('other-server')
    })

    it('parses bare server config', () => {
      const json = { command: 'npx', args: ['-y', 'pkg'], env: { KEY: 'val' } }
      const result = parseJsonConfig(json)
      expect(result.success).toBe(true)
      expect(result.servers).toHaveLength(1)
      expect(result.servers[0].name).toBe('')
      expect(result.servers[0].config.env.KEY).toBe('val')
    })

    it('returns error for non-object JSON', () => {
      expect(parseJsonConfig(null).error).toBe('NOT_MCP_CONFIG')
      expect(parseJsonConfig([]).error).toBe('NOT_MCP_CONFIG')
      expect(parseJsonConfig({}).error).toBe('NOT_MCP_CONFIG')
    })
  })

  // ─── parseCommandLine ───
  describe('parseCommandLine', () => {
    it('parses npx -y command', () => {
      const result = parseCommandLine('npx -y @anthropic/mcp-server')
      expect(result.success).toBe(true)
      expect(result.servers[0].config.command).toBe('npx')
      expect(result.servers[0].config.args).toEqual(['-y', '@anthropic/mcp-server'])
      expect(result.servers[0].name).toBe('anthropic-mcp-server')
    })

    it('parses uvx command', () => {
      const result = parseCommandLine('uvx mcp-server-sqlite --db-path /tmp/db')
      expect(result.success).toBe(true)
      expect(result.servers[0].config.command).toBe('uvx')
      expect(result.servers[0].name).toBe('mcp-server-sqlite')
    })

    it('parses node command with args', () => {
      const result = parseCommandLine('node server.js --port 3000')
      expect(result.success).toBe(true)
      expect(result.servers[0].config.command).toBe('node')
      expect(result.servers[0].config.args).toEqual(['server.js', '--port', '3000'])
    })
  })

  // ─── parseUrl ───
  describe('parseUrl', () => {
    it('parses SSE URL', () => {
      const result = parseUrl('https://api.example.com/sse')
      expect(result.success).toBe(true)
      expect(result.servers[0].config.url).toBe('https://api.example.com/sse')
      expect(result.servers[0].config.transportType).toBe('sse')
      expect(result.servers[0].name).toBe('api-example-com')
    })

    it('parses streamable-http URL (mcp path)', () => {
      const result = parseUrl('https://api.example.com/mcp')
      expect(result.success).toBe(true)
      expect(result.servers[0].config.transportType).toBe('streamable-http')
    })

    it('returns error for invalid URL', () => {
      expect(parseUrl('not-a-url').error).toBe('URL_INVALID')
    })
  })

  // ─── parseMcpInput (integration) ───
  describe('parseMcpInput', () => {
    it('parses JSON string', () => {
      const input = JSON.stringify({ command: 'npx', args: ['-y', 'pkg'] })
      const result = parseMcpInput(input)
      expect(result.success).toBe(true)
      expect(result.servers[0].config.command).toBe('npx')
    })

    it('parses command line string', () => {
      const result = parseMcpInput('npx -y @scope/my-server')
      expect(result.success).toBe(true)
      expect(result.servers[0].name).toBe('scope-my-server')
    })

    it('parses URL string', () => {
      const result = parseMcpInput('https://mcp.example.com/sse')
      expect(result.success).toBe(true)
      expect(result.servers[0].config.url).toBe('https://mcp.example.com/sse')
    })

    it('returns error for empty input', () => {
      expect(parseMcpInput('').error).toBe('INPUT_EMPTY')
      expect(parseMcpInput('  ').error).toBe('INPUT_EMPTY')
    })

    it('returns error for unrecognized format', () => {
      expect(parseMcpInput('just some random text').error).toBe('UNRECOGNIZED_FORMAT')
    })

    it('returns JSON_INVALID when input looks like JSON but has syntax errors', () => {
      expect(parseMcpInput('{ "command": "npx" ').error).toBe('JSON_INVALID')
      expect(parseMcpInput('{"command": "npx",}').error).toBe('JSON_INVALID')
      expect(parseMcpInput('[{]').error).toBe('JSON_INVALID')
    })

    it('trims whitespace before parsing', () => {
      const input = '  \n ' + JSON.stringify({ command: 'npx' }) + ' \n '
      const result = parseMcpInput(input)
      expect(result.success).toBe(true)
    })

    it('parses mcpServers JSON string', () => {
      const input = JSON.stringify({
        mcpServers: {
          fs: { command: 'npx', args: ['-y', 'fs-pkg'] },
        },
      })
      const result = parseMcpInput(input)
      expect(result.success).toBe(true)
      expect(result.servers).toHaveLength(1)
      expect(result.servers[0].name).toBe('fs')
    })

    it('handles JSON with env vars', () => {
      const input = JSON.stringify({
        command: 'npx',
        args: ['-y', 'pkg'],
        env: { API_KEY: 'sk-xxx', BASE_URL: 'https://api.example.com' },
      })
      const result = parseMcpInput(input)
      expect(result.success).toBe(true)
      expect(result.servers[0].config.env.API_KEY).toBe('sk-xxx')
    })
  })
})
