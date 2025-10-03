# Security Headers Configuration

## @stride/headers:v1

**Note:** These headers must be configured at the hosting/CDN level (e.g., Netlify, Vercel, Cloudflare).

Add the following to your hosting configuration:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none';
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(self), microphone=(), geolocation=(self), vibrate=(self)
X-Frame-Options: DENY
```

### Platform-Specific Instructions

**Netlify:** Create `netlify.toml` in project root:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    Content-Security-Policy = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none';"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
    Permissions-Policy = "camera=(self), microphone=(), geolocation=(self), vibrate=(self)"
    X-Frame-Options = "DENY"
```

**Vercel:** Create `vercel.json` in project root:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none';" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "no-referrer" },
        { "key": "Permissions-Policy", "value": "camera=(self), microphone=(), geolocation=(self), vibrate=(self)" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### Notes

- These headers are aligned with OWASP guidance
- CSP is tuned for WebAssembly (ML models) and blob workers
- Camera/geolocation permissions are allowed for app functionality
- Adjust `connect-src` if integrating with external APIs (Supabase, ElevenLabs, etc.)

### References
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
