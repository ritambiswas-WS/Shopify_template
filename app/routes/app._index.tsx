import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

type Product = { id: string; title: string; status: string };

// BACKEND: runs on the Node.js server when the page loads.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query storeProducts {
        products(first: 10, sortKey: UPDATED_AT, reverse: true) {
          nodes {
            id
            title
            status
          }
        }
      }`,
  );
  const responseJson = await response.json();

  return {
    products: (responseJson.data?.products?.nodes ?? []) as Product[],
  };
};

// BACKEND: runs on the Node.js server when the button submits a POST.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];

  const response = await admin.graphql(
    `#graphql
      mutation createSampleProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }`,
    { variables: { product: { title: `${color} Snowboard` } } },
  );
  const responseJson = await response.json();
  const result = responseJson.data?.productCreate;

  return {
    product: result?.product ?? null,
    errors: result?.userErrors ?? [],
  };
};

// FRONTEND: renders inside the Shopify Admin.
export default function Index() {
  const { products } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isCreating = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.product?.id) {
      shopify.toast.show(`Created ${fetcher.data.product.title}`);
    } else if (fetcher.data?.errors?.length) {
      shopify.toast.show(fetcher.data.errors[0].message, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const createProduct = () => fetcher.submit({}, { method: "POST" });

  return (
    <s-page heading="Store products">
      <s-button
        slot="primary-action"
        onClick={createProduct}
        {...(isCreating ? { loading: true } : {})}
      >
        Create sample product
      </s-button>

      <s-section heading="Latest 10 products">
        {products.length === 0 ? (
          <s-paragraph>
            No products yet. Click &quot;Create sample product&quot; to add one.
          </s-paragraph>
        ) : (
          <s-unordered-list>
            {products.map((product) => (
              <s-list-item key={product.id}>
                {product.title}{" "}
                <s-badge
                  tone={product.status === "ACTIVE" ? "success" : "neutral"}
                >
                  {product.status.toLowerCase()}
                </s-badge>
              </s-list-item>
            ))}
          </s-unordered-list>
        )}
      </s-section>

      <s-section slot="aside" heading="How this page works">
        <s-paragraph>
          The <s-text type="strong">loader</s-text> fetches products from the
          Admin GraphQL API on the server. The{" "}
          <s-text type="strong">action</s-text> runs a productCreate mutation
          when you click the button, then the list reloads automatically.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
