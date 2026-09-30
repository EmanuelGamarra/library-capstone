import styled from "styled-components";

interface BookCoverProps {
  coverUrl: string | null;
  title: string;
}

const CoverContainer = styled.div`
  width: 100%;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border-radius: ${({ theme }) => theme.radius.control};
`;

const CoverImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;

  transition: transform 200ms ease;
`;

const CoverFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  width: 100%;
  height: 100%;
  padding: ${({ theme }) => theme.spacing.base};

  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.87rem;
  text-align: center;
`;

function BookCover({ coverUrl, title }: BookCoverProps) {
  if (!coverUrl) {
    return (
      <CoverContainer>
        <CoverFallback>No cover available</CoverFallback>
      </CoverContainer>
    );
  }

  return (
    <CoverContainer>
      <CoverImage src={coverUrl} alt={`Cover of ${title}`} />
    </CoverContainer>
  );
}

export default BookCover;
