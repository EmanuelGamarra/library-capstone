import styled from "styled-components";
import type { Book } from "../../types/book";
import { Link } from "react-router-dom";
import BookCover from "./BookCover";

interface BookCardProps {
  book: Book;
}

const CardLink = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.base};
  height: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.card};
  box-shadow: ${({ theme }) => theme.shadows.card};

  transition:
    transform 150ms ease;
    box-shadow 150ms ease;

  &:hover {
    transform: translateY(-3px);
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: 3px;
  }
`;

const BookInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const BookTitle = styled.h3`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 1.12rem;
  line-height: 1.3;
`;

const Authors = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.87rem;
  font-weight: 500;
  line-height: 1.5;
`;

const PublicationYear = styled.p`
  margin: 0;

  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.81rem;
  line-height: 1.5;
`;

function BookCard({ book }: BookCardProps) {
  const authorText =
    book.authors.length > 0 ? book.authors.join(", ") : "Unkown author";

  const publicationText = book.firstPublishYear
    ? `First published ${book.firstPublishYear}`
    : "Publication year unavailable";

  return (
    <CardLink to={`/books/${book.id}`}>
      <BookCover coverUrl={book.coverUrl} title={book.title} />

      <BookInfo>
        <BookTitle>{book.title}</BookTitle>
        <Authors>{authorText}</Authors>
        <PublicationYear>{publicationText}</PublicationYear>
      </BookInfo>
    </CardLink>
  );
}

export default BookCard;
