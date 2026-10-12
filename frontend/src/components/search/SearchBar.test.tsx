import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './SearchBar';

test('trims the query and submits the selected search type', async () => {
  const user = userEvent.setup();
  const onSearch = jest.fn();
  render(<SearchBar onSearch={onSearch} />);

  await user.type(screen.getByRole('searchbox', { name: /search books/i }), '  clean code  ');
  await user.selectOptions(screen.getByRole('combobox', { name: /search by/i }), 'title');
  await user.click(screen.getByRole('button', { name: /^search$/i }));

  expect(onSearch).toHaveBeenCalledWith('clean code', 'title');
});

test('does not submit an empty query', async () => {
  const user = userEvent.setup();
  const onSearch = jest.fn();
  render(<SearchBar onSearch={onSearch} />);
  await user.click(screen.getByRole('button', { name: /^search$/i }));
  expect(onSearch).not.toHaveBeenCalled();
});
