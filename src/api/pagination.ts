interface ListPage<T> {
  results: T[];
  next?: string | null;
}

export async function allPages<T>(
  fetchPage: (page: number) => Promise<{ data: T[] | ListPage<T> }>,
): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  while (true) {
    const { data } = await fetchPage(page);
    if (Array.isArray(data)) return [...rows, ...data];
    if (!Array.isArray(data.results))
      throw new Error("The server returned an invalid list response.");
    rows.push(...data.results);
    if (!data.next) return rows;
    // Keep requests on the original API endpoint rather than following arbitrary URLs.
    const nextPage = Number(
      new URL(data.next, "http://pagination.local").searchParams.get("page"),
    );
    if (!Number.isSafeInteger(nextPage) || nextPage <= page)
      throw new Error("The server returned an invalid pagination link.");
    page = nextPage;
  }
}
