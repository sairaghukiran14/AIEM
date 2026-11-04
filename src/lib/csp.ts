/**
 * The Content Security Policy for pages. Pure, so it can be tested without a server.
 *
 * Scripts need a per-request nonce: Next.js puts it on its own scripts, and 'strict-dynamic' lets those load the rest, so
 * an injected script with no nonce does not run. Styles allow inline because React and the animation library write style
 * attributes, which a nonce cannot cover. Nothing may be framed, submitted to another site, or loaded as a plugin.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // React uses eval in development for better error stacks. Production needs none.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Development hot reload uses a WebSocket.
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    // The code-challenge worker is a file from this site, never a blob.
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/** A fresh, unguessable value for every request. */
export function newNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * The policy for the code-challenge worker. It may use eval, because running the learner's own code is its whole job,
 * and nothing else: it cannot make a network request, load a script, or open a connection.
 */
export const WORKER_CSP = "default-src 'none'; script-src 'unsafe-eval'; connect-src 'none'";
