import { useEffect, useState } from "react";
import styled from "styled-components";
import { getTrendingBooks } from "../api/openLibraryApi";
import BookGrid from "../components/books/BookGrid";
import type { Book } from "../types/book";

const Page = styled.main`
  width: min(100% - 32px, 1200px);
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} 0
    ${({ theme }) => theme.spacing.xxxl};

  @media (min-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: min(100% - 48px, 1200px);
  }
`;

const PageHeader = styled.header`
  max-width: 680px;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.15;
`;

const Subtitle = styled.p`
  margin: ${({ theme }) => theme.spacing.sm} 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 1rem;
  line-height: 1.6;
`;

const CatalogSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 1.5rem;
  line-height: 1.35;
`;

const StatusMessage = styled.p`
  margin: 0;

  color: ${({ theme }) => theme.colors.textSecondary};
`;

function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrendingBooks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const trendingBooks = await getTrendingBooks();

        setBooks(trendingBooks);
      } catch (error) {
        console.error(error);

        setError("Unable to load books. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTrendingBooks();
  }, []);

  return (
    <Page>
      <PageHeader>
        <Title>Explore Books</Title>
        <Subtitle>Discover your next book.</Subtitle>
      </PageHeader>

      <CatalogSection aria-labelledby="trending-books-heading">
        <SectionTitle id="trending-books-heading">Trending Books</SectionTitle>

        {isLoading && <StatusMessage>Loading books...</StatusMessage>}
        {!isLoading && error && <StatusMessage>{error}</StatusMessage>}

        {!isLoading && !error && books.length === 0 && (
          <StatusMessage>No books available.</StatusMessage>
        )}

        {!isLoading && !error && books.length > 0 && <BookGrid books={books} />}
      </CatalogSection>
    </Page>
  );
}

export default HomePage;
