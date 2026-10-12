import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

test('navigates to adjacent pages', async () => {
  const user = userEvent.setup();
  const onPageChange = jest.fn();
  render(<Pagination currentPage={2} totalPages={4} onPageChange={onPageChange} />);
  expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /previous/i }));
  await user.click(screen.getByRole('button', { name: /next/i }));
  expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
  expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
});

test('disables navigation at page boundaries', () => {
  const { rerender } = render(<Pagination currentPage={1} totalPages={3} onPageChange={jest.fn()} />);
  expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  rerender(<Pagination currentPage={3} totalPages={3} onPageChange={jest.fn()} />);
  expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
});
