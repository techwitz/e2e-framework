export class JwtHelper {
  /**
   * Builds an unsigned (alg: none), synthetic JWT for test-only session seeding.
   * Accepts any payload shape — this package doesn't know or care what claims a
   * consuming app expects.
   */
  static createSyntheticToken(payload: Record<string, unknown> & { exp?: number }): string {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
    const body = Buffer.from(
      JSON.stringify({
        ...payload,
        exp: payload.exp ?? Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
      }),
    ).toString('base64');
    return `${header}.${body}.e2e-synthetic-signature`;
  }
}
