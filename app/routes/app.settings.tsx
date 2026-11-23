import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// BACKEND: read this shop's settings (or defaults) from the database.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const settings = await db.appSettings.findUnique({
    where: { shop: session.shop },
  });

  return { discount: settings?.discount ?? 10 };
};

// BACKEND: validate and save the submitted form.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const discount = Number(formData.get("discount"));

  if (!Number.isInteger(discount) || discount < 0 || discount > 100) {
    return { ok: false, error: "Discount must be a whole number from 0 to 100." };
  }

  await db.appSettings.upsert({
    where: { shop: session.shop },
    update: { discount },
    create: { shop: session.shop, discount },
  });

  return { ok: true, error: null };
};

// FRONTEND
export default function Settings() {
  const { discount } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [value, setValue] = useState(String(discount));

  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.ok) shopify.toast.show("Settings saved");
  }, [fetcher.data, shopify]);

  const save = () => fetcher.submit({ discount: value }, { method: "POST" });

  return (
    <s-page heading="Settings">
      <s-button
        slot="primary-action"
        onClick={save}
        {...(isSaving ? { loading: true } : {})}
      >
        Save
      </s-button>

      <s-section heading="Discount">
        <s-number-field
          label="Default discount (%)"
          name="discount"
          min={0}
          max={100}
          value={value}
          error={fetcher.data?.error ?? undefined}
          onInput={(e) => setValue(e.currentTarget.value)}
        />
        <s-paragraph>
          Saved per shop in the <s-text type="strong">AppSettings</s-text>{" "}
          table via Prisma.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
