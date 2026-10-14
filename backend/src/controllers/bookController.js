import { getBookAvailability } from "../services/bookService.js";

const OPEN_LIBRARY_WORK_ID = /^OL[0-9]+W$/;

export async function getAvailability(req, res) {
  const { openLibraryId } = req.params;

  if (!OPEN_LIBRARY_WORK_ID.test(openLibraryId)) {
    return res.status(400).json({
      message: "Invalid Open Library work ID",
    });
  }

  const availability = await getBookAvailability(openLibraryId);

  return res.status(200).json(availability);
}
