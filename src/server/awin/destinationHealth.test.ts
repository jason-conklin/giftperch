import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublicDestinationAddress,
  validateAwinProductDestination,
} from "./destinationHealth";

const affiliateUrl = "https://www.awin1.com/pclick.php?p=123&a=2673864&m=95201";
const productUrl = "https://www.giftlab.com/products/custom-photo-mug";

function response(
  status: number,
  url: string,
  options: { location?: string; body?: string } = {},
): Response {
  const result = new Response(options.body ?? "<html><title>Product</title></html>", {
    status,
    headers: {
      "content-type": "text/html",
      ...(options.location ? { location: options.location } : {}),
    },
  });
  Object.defineProperty(result, "url", { value: url });
  return result;
}

function fetchSequence(responses: Response[]): typeof fetch {
  let index = 0;
  return (async () => {
    const next = responses[index++];
    if (!next) throw new Error("Unexpected request");
    return next;
  }) as typeof fetch;
}

test("accepts a tracking link that resolves to the expected product page", async () => {
  const result = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    verifyTrackingRedirect: true,
    fetchImpl: fetchSequence([
      response(302, affiliateUrl, { location: productUrl }),
      response(200, productUrl),
    ]),
  });
  assert.equal(result.status, "valid");
  assert.equal(result.reason, "matching_product");
});

test("checks the merchant destination directly unless tracking verification is requested", async () => {
  const requests: string[] = [];
  const result = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    fetchImpl: (async (input) => {
      requests.push(String(input));
      return response(200, productUrl);
    }) as typeof fetch,
  });
  assert.equal(result.status, "valid");
  assert.deepEqual(requests, [productUrl]);
});

test("rejects a successful homepage redirect", async () => {
  const result = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    verifyTrackingRedirect: true,
    fetchImpl: fetchSequence([
      response(302, affiliateUrl, { location: productUrl }),
      response(301, productUrl, { location: "https://www.giftlab.com/" }),
      response(200, "https://www.giftlab.com/"),
    ]),
  });
  assert.equal(result.status, "invalid");
  assert.equal(result.reason, "merchant_homepage");
});

test("rejects unrelated products and category pages", async () => {
  const unrelated = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    verifyTrackingRedirect: true,
    fetchImpl: fetchSequence([
      response(302, affiliateUrl, {
        location: "https://www.giftlab.com/products/dog-seat-cover",
      }),
      response(200, "https://www.giftlab.com/products/dog-seat-cover"),
    ]),
  });
  const category = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    verifyTrackingRedirect: true,
    fetchImpl: fetchSequence([
      response(302, affiliateUrl, {
        location: "https://www.giftlab.com/collections/mugs",
      }),
      response(200, "https://www.giftlab.com/collections/mugs"),
    ]),
  });
  assert.equal(unrelated.reason, "unrelated_product");
  assert.equal(category.reason, "category_page");
});

test("does not follow redirects outside the configured merchant hosts", async () => {
  let requests = 0;
  const result = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    allowedMerchantHosts: ["giftlab.com"],
    fetchImpl: (async (input) => {
      requests += 1;
      return response(302, String(input), {
        location: "https://internal.example.test/private",
      });
    }) as typeof fetch,
  });
  assert.equal(result.status, "invalid");
  assert.equal(result.reason, "unexpected_host");
  assert.equal(requests, 1);
});

test("rejects private, local, link-local, documentation, and mapped IP destinations", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.4",
    "172.20.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "192.0.2.8",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
  ]) {
    assert.equal(isPublicDestinationAddress(address), false, address);
  }
  assert.equal(isPublicDestinationAddress("8.8.8.8"), true);
  assert.equal(isPublicDestinationAddress("2606:4700:4700::1111"), true);
});

test("rejects IP-literal and deceptive merchant hosts before fetching", async () => {
  let requests = 0;
  for (const destinationUrl of [
    "https://127.0.0.1/products/custom-photo-mug",
    "https://giftlab.com.evil.test/products/custom-photo-mug",
    "https://giftlab.com@evil.test/products/custom-photo-mug",
  ]) {
    const result = await validateAwinProductDestination({
      affiliateUrl,
      destinationUrl,
      allowedMerchantHosts: ["giftlab.com"],
      fetchImpl: (async () => {
        requests += 1;
        return response(200, destinationUrl);
      }) as typeof fetch,
    });
    assert.equal(result.status, "invalid");
  }
  assert.equal(requests, 0);
});

test("rejects allowed hosts that resolve to private addresses before fetching", async () => {
  let requests = 0;
  const result = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    allowedMerchantHosts: ["giftlab.com"],
    resolveAddresses: async () => ["169.254.169.254"],
    fetchImpl: (async () => {
      requests += 1;
      return response(200, productUrl);
    }) as typeof fetch,
  });
  assert.equal(result.status, "invalid");
  assert.equal(result.reason, "unexpected_host");
  assert.equal(requests, 0);
});

test("rejects merchant not-found responses and malformed tracking links", async () => {
  const notFound = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    verifyTrackingRedirect: true,
    fetchImpl: fetchSequence([response(404, affiliateUrl)]),
  });
  const malformed = await validateAwinProductDestination({
    affiliateUrl: "https://giftlab.com/products/fake",
    destinationUrl: productUrl,
  });
  assert.equal(notFound.reason, "merchant_not_found");
  assert.equal(malformed.reason, "malformed_url");
});

test("keeps timeouts, temporary failures, and bot challenges uncertain", async () => {
  const timeout = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    verifyTrackingRedirect: true,
    fetchImpl: (async () => {
      throw new DOMException("timed out", "TimeoutError");
    }) as typeof fetch,
  });
  const temporary = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    verifyTrackingRedirect: true,
    fetchImpl: fetchSequence([response(503, affiliateUrl)]),
  });
  const blocked = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    verifyTrackingRedirect: true,
    fetchImpl: fetchSequence([
      response(200, productUrl, { body: "<html>Verify you are human</html>" }),
    ]),
  });
  assert.deepEqual(
    [timeout.status, temporary.status, blocked.status],
    ["uncertain", "uncertain", "uncertain"],
  );
  assert.equal(timeout.reason, "timeout");
  assert.equal(blocked.reason, "bot_protection");
});

test("rejects missing destination parameters and redirect loops", async () => {
  const missing = await validateAwinProductDestination({
    affiliateUrl: "",
    destinationUrl: productUrl,
  });
  const loop = await validateAwinProductDestination({
    affiliateUrl,
    destinationUrl: productUrl,
    verifyTrackingRedirect: true,
    fetchImpl: fetchSequence([
      response(302, affiliateUrl, { location: productUrl }),
      response(302, productUrl, { location: affiliateUrl }),
    ]),
  });
  assert.equal(missing.reason, "malformed_url");
  assert.equal(loop.reason, "redirect_loop");
});
