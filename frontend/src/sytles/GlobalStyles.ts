import { createGlobalStyle } from "styled-components";

export const GlobalStyles = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    font-family: ${({ theme }) => theme.fonts.body};
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;

    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};

    font-family: ${({ theme }) => theme.fonts.body};
    line-height: 1.5;
  }

  h1,
  h2,
  h3,
  h4 {
    margin: 0;

    font-family: ${({ theme }) => theme.fonts.heading};
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  img {
    display: block;
    max-width: 100%;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
`;
