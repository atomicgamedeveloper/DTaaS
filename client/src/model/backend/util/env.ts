export default function getAuthority(): string {
  return globalThis.env.REACT_APP_AUTH_AUTHORITY;
}
