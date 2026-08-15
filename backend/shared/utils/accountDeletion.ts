/**
 * OmniQ shared package - account deletion.
 * Author: OmniQ Team
 *
 * Google Play's User Data policy requires that an in-app deletion request actually deletes the
 * account and the personal data attached to it, not merely file a ticket. Two call sites share this
 * routine so they cannot drift apart:
 *
 *   - user-service `DELETE /users/me`      - the person deletes their own account (self-service).
 *   - admin-service `PATCH /admin/user-requests/:id` - an administrator approves a request row.
 *
 * What is deleted vs. what is retained is a deliberate, documented split (docs/ACCOUNT_DELETION.md):
 *
 *   DELETED   auth user (email, password hash, metadata), profile (name, phone, address, pincode),
 *             cart contents, the seller's GST number and bank account, saved requests.
 *   RETAINED  order and order-item rows, with every identifying field stripped. Indian tax law
 *             requires books of account and invoices to be kept; an order row with no buyer link,
 *             no address and no coordinates is a financial record, not personal data. Sellers also
 *             need their own sales history to survive a buyer leaving.
 *
 * The routine is NOT transactional across Postgres and GoTrue - `auth.admin.deleteUser` is a
 * separate API. It is therefore ordered so that a failure at any point leaves the account usable
 * rather than half-erased, and the personal data is cleared BEFORE the auth user is removed. The
 * `account_deletions` row survives the cascade and records what actually happened.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type DeletionInitiator = "self_service" | "admin_approved";

export type DeletionResult = {
  userId: string;
  ordersAnonymised: number;
  sellerDetached: boolean;
  completedAt: string;
};

/**
 * Placeholder written over `orders.delivery_address`. The shape is kept (admin and seller screens
 * read `.street`, `.city`, `.pincode`) so nothing renders as a crash after a buyer leaves.
 */
const REDACTED_ADDRESS = {
  line1: "[deleted]",
  street: "[deleted]",
  city: "[deleted]",
  state: "[deleted]",
  pincode: "[deleted]",
  zip: "[deleted]",
  fullName: "[deleted account]",
  phone: "[deleted]"
};

/**
 * Permanently deletes a user account and the personal data attached to it.
 *
 * @param admin  a Supabase client created with the SERVICE ROLE key. RLS denies every table this
 *               function touches, and `auth.admin.deleteUser` needs service-role privileges.
 * @throws       on any failure. Callers must not report success to the user when this throws -
 *               the previous implementation logged and continued, which told people their account
 *               was gone while it was still live.
 */
export async function deleteUserAccount(
  admin: SupabaseClient,
  userId: string,
  initiatedBy: DeletionInitiator
): Promise<DeletionResult> {
  if (!userId) throw new Error("A user id is required to delete an account.");

  // Written first so that a crash mid-way still leaves evidence of the attempt. The row outlives
  // the profile cascade because account_deletions has no foreign key to profiles - deliberately.
  const { data: auditRow, error: auditError } = await admin
    .from("account_deletions")
    .insert({ user_id: userId, initiated_by: initiatedBy, outcome: "pending" })
    .select("id")
    .single();

  if (auditError) {
    throw new Error(`Could not start account deletion: ${auditError.message}`);
  }

  const auditId = auditRow.id as string;

  const failAudit = async (reason: string) => {
    await admin
      .from("account_deletions")
      .update({ outcome: "failed", failure_reason: reason.slice(0, 500) })
      .eq("id", auditId);
  };

  try {
    // 1. Strip personal data out of the retained order records.
    //    `orders.buyer_id` is `on delete set null`, so the link would break on its own - but the
    //    address JSON and the GPS coordinates are denormalised copies that no cascade would touch.
    const { data: anonymisedOrders, error: orderError } = await admin
      .from("orders")
      .update({
        delivery_address: REDACTED_ADDRESS,
        buyer_lat: null,
        buyer_lng: null,
        buyer_id: null,
        updated_at: new Date().toISOString()
      })
      .eq("buyer_id", userId)
      .select("id");

    if (orderError) throw new Error(`Failed to anonymise orders: ${orderError.message}`);
    const ordersAnonymised = anonymisedOrders?.length ?? 0;

    // 2. Cart contents. `cart_items.buyer_id` cascades from auth.users, but deleting explicitly
    //    means the data is gone even if the auth deletion in step 5 fails and has to be retried.
    const { error: cartError } = await admin.from("cart_items").delete().eq("buyer_id", userId);
    if (cartError) throw new Error(`Failed to clear cart: ${cartError.message}`);

    // 3. Detach the seller profile, if this account has one.
    //
    //    This step is what makes seller deletion possible at all: `sellers.owner_id` cascades from
    //    auth.users, while `orders.seller_id` is `on delete restrict`. Deleting the auth user of a
    //    seller who has ever received an order therefore fails in Postgres, and the old code
    //    swallowed that error. Nulling `owner_id` first breaks the cascade path, so the sellers row
    //    (and every order pointing at it) survives with no link to a person.
    const { data: sellerRows, error: sellerLookupError } = await admin
      .from("sellers")
      .select("id")
      .eq("owner_id", userId);

    if (sellerLookupError) throw new Error(`Failed to look up seller profile: ${sellerLookupError.message}`);

    let sellerDetached = false;
    if (sellerRows && sellerRows.length > 0) {
      const sellerIds = sellerRows.map((row: { id: string }) => row.id);

      const { error: sellerUpdateError } = await admin
        .from("sellers")
        .update({
          owner_id: null,
          business_name: "Deleted seller",
          description: null,
          // Financial identifiers. These are the most sensitive columns in the schema and are not
          // needed to keep a historical order row meaningful.
          gst_number: null,
          bank_account: null,
          status: "suspended",
          deleted_at: new Date().toISOString()
        })
        .in("id", sellerIds);

      if (sellerUpdateError) throw new Error(`Failed to detach seller profile: ${sellerUpdateError.message}`);

      // A shop with no owner must stop selling. Soft-delete rather than hard-delete: `products` is
      // referenced by order_items, and destroying it would gut the retained order history.
      const { error: productError } = await admin
        .from("products")
        .update({ deleted_at: new Date().toISOString(), is_approved: false, updated_at: new Date().toISOString() })
        .in("seller_id", sellerIds)
        .is("deleted_at", null);

      if (productError) throw new Error(`Failed to withdraw seller products: ${productError.message}`);
      sellerDetached = true;
    }

    // 4. Requests carry the reason text the person typed. They would cascade with the profile, but
    //    the cascade runs after the auth deletion - clear them while we still control ordering.
    const { error: requestError } = await admin.from("user_requests").delete().eq("user_id", userId);
    if (requestError) throw new Error(`Failed to clear user requests: ${requestError.message}`);

    // 5. The auth user itself. Cascades to public.profiles (name, phone, address, pincode) and
    //    removes the email, password hash and metadata held by GoTrue.
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) throw new Error(`Failed to delete the authentication record: ${authError.message}`);

    const completedAt = new Date().toISOString();
    await admin
      .from("account_deletions")
      .update({
        outcome: "completed",
        completed_at: completedAt,
        orders_anonymised: ordersAnonymised,
        seller_detached: sellerDetached
      })
      .eq("id", auditId);

    // Deliberately no identifying detail in the log line - see the safe-logging rule in
    // docs/ARCHITECTURE_AUDIT.md. The user id is a pseudonymous key, not a contact detail.
    console.log(`[accountDeletion] completed for ${userId} (${initiatedBy}), ${ordersAnonymised} orders anonymised`);

    return { userId, ordersAnonymised, sellerDetached, completedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failAudit(message);
    throw error;
  }
}
