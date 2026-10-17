import {
  readingStatusParamsSchema,
  updateReadingStatusSchema,
} from "../validators/readingStatusValidator.js";

import {
  getReadingStatus,
  updateReadingStatus,
} from "../services/readingStatusService.js";

export async function getMyReadingStatus(req, res) {
  const params = readingStatusParamsSchema.safeParse(req.params);

  if (!params.success) {
    return res.status(400).json({
      message: "Invalid book ID",
    });
  }

  const result = await getReadingStatus(req.user.id, params.data.openLibraryId);

  return res.status(200).json(result);
}

export async function saveMyReadingStatus(req, res) {
  const params = readingStatusParamsSchema.safeParse(req.params);
  const body = updateReadingStatusSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    return res.status(400).json({
      message: "Invalid reading status request",
    });
  }

  const result = await updateReadingStatus(
    req.user.id,
    params.data.openLibraryId,
    body.data.status,
  );

  return res.status(200).json(result);
}
