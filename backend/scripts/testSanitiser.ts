/** OmniQ diagnostics - unit checks for sanitiseErrorMessage. Author: OmniQ Team */
import { sanitiseErrorMessage as s } from "../shared/utils/responseFormatter";
const cases: Array<[string, string, boolean]> = [
  ["Failed to fetch seller: invalid input syntax for type uuid: \"not-a-uuid\"", "postgres uuid", false],
  ["Failed to fetch seller: <!DOCTYPE html>\n<html class=\"x\">" + "y".repeat(5000), "cloudflare html", false],
  ["duplicate key value violates unique constraint \"sellers_pkey\"", "dupe key", false],
  ["column sellers.user_id does not exist", "missing column", false],
  ["Invalid login credentials", "supabase auth (must pass through)", true],
  ["Email not confirmed", "supabase auth (must pass through)", true],
  ["Advertisement id must be a valid uuid.", "our own message (must pass through)", true],
  ["That service is starting up. Please try again in a moment.", "gateway 503 (must pass through)", true],
];
let bad = 0;
for (const [input, label, shouldPassThrough] of cases) {
  const out = s(input);
  const passed = out === input;
  const leaks = /invalid input syntax|<!DOCTYPE|does not exist|violates unique/i.test(out);
  const okCase = shouldPassThrough ? passed : (!passed && !leaks && out.length < 200);
  if (!okCase) bad++;
  console.log(`${okCase ? "PASS" : "FAIL"}  ${label}\n      -> ${out.slice(0,120)}`);
}
console.log(bad === 0 ? "\nAll sanitiser cases passed." : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
