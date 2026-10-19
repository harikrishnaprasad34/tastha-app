/** Native geocoders can stall without exposing cancellation. Bound the wait and
 * ignore late results so manual address entry always becomes available. */
export async function optionalLocationLookup<T>(
  request: Promise<T>,
  milliseconds = 7000,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request.catch(() => null),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
