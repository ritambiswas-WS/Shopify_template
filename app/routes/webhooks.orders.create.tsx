import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// Called by Shopify whenever a new order is placed (subscribed in shopify.app.toml).
export const action = async ({ request }: ActionFunctionArgs) => {
  // Verifies the HMAC signature; throws a 401 if the request isn't from Shopify.
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(
    `Received ${topic} for ${shop}: order #${payload.order_number}, total ${payload.total_price} ${payload.currency}`,
  );

  // Add your own logic here, e.g. save the order to the database with `db`.

  return new Response();
};
