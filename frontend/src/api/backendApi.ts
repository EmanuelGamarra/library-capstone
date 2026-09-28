import { API_URL } from "./config";

interface HealthResponse {
  status: string;
}

export const getHealth = async (): Promise<HealthResponse> => {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error("Backend health request failed.");
  }

  return response.json();
};
