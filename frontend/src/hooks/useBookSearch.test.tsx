import { act, renderHook, waitFor } from '@testing-library/react';
import { searchBooks } from '../api/openLibraryApi';
import { useBookSearch } from './useBookSearch';

jest.mock('../api/openLibraryApi', () => ({ searchBooks: jest.fn() }));
const mockSearchBooks = searchBooks as jest.MockedFunction<typeof searchBooks>;
const params: Parameters<typeof useBookSearch>[0] = {
  query: 'react',
  type: 'all',
  filters: { subject: '', yearFrom: undefined, yearTo: undefined } as Parameters<typeof useBookSearch>[0]['filters'],
  sort: 'relevance',
  page: 1,
};

test('loads search results from the mocked API', async () => {
  mockSearchBooks.mockResolvedValueOnce({ books: [], totalResults: 12 });
  const { result } = renderHook(() => useBookSearch(params));
  await waitFor(() => expect(result.current.totalResults).toBe(12));
  expect(result.current.error).toBeNull();
  expect(result.current.isLoading).toBe(false);
  expect(mockSearchBooks).toHaveBeenCalledWith(expect.objectContaining({ query: 'react', page: 1 }));
});

test('exposes a friendly error and allows retrying', async () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    mockSearchBooks.mockRejectedValueOnce(new Error('API down'))
      .mockResolvedValueOnce({ books: [], totalResults: 3 });
    const { result } = renderHook(() => useBookSearch(params));
    await waitFor(() => expect(result.current.error).toMatch(/Unable to search books/i));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.totalResults).toBe(3));
    expect(result.current.error).toBeNull();
    expect(mockSearchBooks).toHaveBeenCalledTimes(2);
  } finally {
    consoleSpy.mockRestore();
  }
});
