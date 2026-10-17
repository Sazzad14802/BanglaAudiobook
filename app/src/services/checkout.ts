/**
 * Hosted checkout orchestration (SSLCommerz).
 *
 * The browser only carries the user through the gateway; the order's real status
 * always comes from the API, which validates every transaction server-to-server.
 */

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { paymentsApi } from '../api/account';
import { PaymentOrder } from '../types/domain';

export type CheckoutOutcome = 'success' | 'failed' | 'cancelled' | 'pending';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Deep link the gateway redirects back to (exp://…/--/payment-result in Expo Go). */
export function paymentReturnUrl(): string {
  return Linking.createURL('payment-result');
}

/** Poll the server until the order leaves `pending` (validation can lag the redirect slightly). */
export async function awaitOrderResult(orderId: string, attempts = 6): Promise<PaymentOrder> {
  let order = await paymentsApi.get(orderId);
  for (let i = 1; i < attempts && order.status === 'pending'; i++) {
    await sleep(1500);
    order = await paymentsApi.get(orderId);
  }
  return order;
}

/**
 * Run the full hosted checkout for a pending SSLCommerz order.
 * Resolves with the server's view of the order once the user returns.
 */
export async function runHostedCheckout(order: PaymentOrder): Promise<{ order: PaymentOrder; outcome: CheckoutOutcome }> {
  const returnUrl = paymentReturnUrl();
  const { gateway_url } = await paymentsApi.checkout(order.id, returnUrl);
  const result = await WebBrowser.openAuthSessionAsync(gateway_url, returnUrl);

  if (result.type !== 'success') {
    // Closed the browser: the payment may still have gone through (e.g. IPN), so ask the server.
    const latest = await paymentsApi.get(order.id);
    return { order: latest, outcome: latest.status === 'success' ? 'success' : 'cancelled' };
  }

  const redirected = Linking.parse(result.url).queryParams?.status;
  const latest = await awaitOrderResult(order.id, redirected === 'success' || redirected === 'pending' ? 6 : 1);
  if (latest.status === 'success') return { order: latest, outcome: 'success' };
  if (redirected === 'cancel') return { order: latest, outcome: 'cancelled' };
  if (redirected === 'fail') return { order: latest, outcome: 'failed' };
  return { order: latest, outcome: latest.status === 'pending' ? 'pending' : 'failed' };
}
