import styled from "styled-components";
import BookCard from "./BookCard";
import type { Book } from "../../types/book";

interface BookGridProps {
  books: Book[];
}

const Grid = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(180px, 100%), 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const GridItem = styled.li`
  min-width: 0;
`;

function BookGrid({ books }: BookGridProps) {
  return (
    <Grid>
      {books.map((book) => (
        <GridItem key={book.id}>
          <BookCard book={book} />
        </GridItem>
      ))}
    </Grid>
  );
}

export default BookGrid;
