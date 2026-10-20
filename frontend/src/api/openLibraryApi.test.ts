import type { Book } from "../types/book";
import { getBookDetails } from "./openLibraryApi";

const mockResponse = (body: unknown, status = 200): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
};

const searchMetadata: Book = {
  id: "OL123W",
  title: "Search title",
  authors: ["Search Author"],
  coverUrl: "https://covers.openlibrary.org/b/id/200-M.jpg",
  firstPublishYear: 2025,
};

describe("getBookDetails", () => {
  const originalFetch = globalThis.fetch;
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

  beforeAll(() => {
    globalThis.fetch = fetchMock;
  });

  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  test("prioritizes complete Work metadata over Search metadata", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockResponse({
          title: "Work title",
          authors: [{ author: { key: "/authors/OL1A" } }],
          covers: [100],
          first_publish_date: "2001",
          description: "Work description",
          subjects: ["History"],
        }),
      )
      .mockResolvedValueOnce(mockResponse({ name: "Work Author" }));

    const book = await getBookDetails("OL123W", undefined, searchMetadata);

    expect(book).toMatchObject({
      title: "Work title",
      authors: ["Work Author"],
      coverUrl: "https://covers.openlibrary.org/b/id/100-L.jpg",
      firstPublishYear: 2001,
      description: "Work description",
      subjects: ["History"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("fills missing Work fields from matching navigation metadata without another Search request", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ title: "Work title" }));

    const book = await getBookDetails("OL123W", undefined, searchMetadata);

    expect(book).toMatchObject({
      title: "Work title",
      authors: ["Search Author"],
      coverUrl: "https://covers.openlibrary.org/b/id/200-M.jpg",
      firstPublishYear: 2025,
      description: null,
      subjects: [],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("uses an exact Work lookup when opened directly without navigation metadata", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ title: "Work title" }))
      .mockResolvedValueOnce(
        mockResponse({
          num_found: 1,
          start: 0,
          docs: [
            {
              key: "/works/OL123W",
              title: "Search title",
              author_name: ["Search Author"],
              cover_i: 200,
              first_publish_year: 2025,
            },
          ],
        }),
      );

    const book = await getBookDetails("OL123W");

    expect(book).toMatchObject({
      authors: ["Search Author"],
      coverUrl: "https://covers.openlibrary.org/b/id/200-M.jpg",
      firstPublishYear: 2025,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "q=key%3A%22%2Fworks%2FOL123W%22",
      ),
      { signal: undefined },
    );
  });

  test("keeps unavailable values when neither source contains metadata", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ title: "Sparse Work" }))
      .mockResolvedValueOnce(
        mockResponse({ num_found: 0, start: 0, docs: [] }),
      );

    await expect(getBookDetails("OL123W")).resolves.toMatchObject({
      authors: [],
      coverUrl: null,
      firstPublishYear: null,
      description: null,
      subjects: [],
    });
  });

  test("propagates an abort from the optional Search lookup", async () => {
    const controller = new AbortController();

    fetchMock
      .mockResolvedValueOnce(mockResponse({ title: "Sparse Work" }))
      .mockImplementationOnce((_input, init) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Request aborted", "AbortError"));
          });
        });
      });

    const request = getBookDetails("OL123W", controller.signal);
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });

  test("rejects Edition IDs without making a request", async () => {
    await expect(getBookDetails("OL123M")).rejects.toThrow(
      "Invalid Open Library Work ID.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
