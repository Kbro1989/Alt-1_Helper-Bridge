// src/utils/remoteItemsApi.ts

const WORKER_ENDPOINT = import.meta.env.VITE_WORKER_ENDPOINT;

export async function fetchRemoteItemIndex(): Promise<[number, string][] | null> {
  if (!WORKER_ENDPOINT) {
    console.warn("VITE_WORKER_ENDPOINT not set, falling back to local index.");
    return null;
  }
  
  try {
    const response = await fetch(`${WORKER_ENDPOINT}/items/index`);
    if (!response.ok) throw new Error("Failed to fetch remote index");
    return await response.json();
  } catch (error) {
    console.error("Error fetching remote index:", error);
    return null;
  }
}
