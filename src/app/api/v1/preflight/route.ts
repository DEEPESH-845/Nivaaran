/**
 * Versioned alias.
 *
 * `/api/preflight` is the path documented since the first build and printed in
 * demo material, so it stays. New integrations should pin `/api/v1/preflight`;
 * both are the same handler, and both report their apiVersion in the body.
 */
export { GET, POST } from "@/app/api/preflight/route";
