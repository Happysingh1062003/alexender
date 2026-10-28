/*
 * Which account this browser is signed in as (set at sign-in). Each account keeps its own local
 * copy of the data, so someone else signing in on the same phone never sees — or merges — yours.
 * The owner keeps the original names, so data saved before accounts existed is still found.
 */

let current: string | undefined;

/**
 * Read once per page load. Signing in or out always loads a fresh page, so the account can't
 * change underneath a running app — not even in the moment between signing out and leaving,
 * when a late save must still go to the account it came from.
 */
export function accountId() {
  if (typeof document === "undefined") return "owner";
  return (current ??= document.cookie.match(/(?:^|;\s*)alex_user=([\w-]{1,64})/)?.[1] ?? "owner");
}

/** A storage key for the signed-in account. */
export const scoped = (key: string) => {
  const id = accountId();
  return id === "owner" ? key : `${key}:${id}`;
};
