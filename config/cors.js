/** Allow requests from any origin (reflects the request Origin header). */
export function createCorsOptions() {
  return {
    origin: true,
    credentials: true,
  }
}
