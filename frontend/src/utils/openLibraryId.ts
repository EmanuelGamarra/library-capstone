const OPEN_LIBRARY_WORK_ID_PATTERN = /^OL\d+W$/;

export const isOpenLibraryWorkId = (value: string): boolean => {
  return OPEN_LIBRARY_WORK_ID_PATTERN.test(value);
};
