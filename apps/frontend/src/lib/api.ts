const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  response: string;
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to send chat message');
  }

  return response.json();
}

export interface Item {
  id: string;
  title: string;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export async function getItems(): Promise<{ data: Item[] }> {
  const response = await fetch(`${API_URL}/api/items`);

  if (!response.ok) {
    throw new Error('Failed to fetch items');
  }

  return response.json();
}

export async function createItem(item: Partial<Item>): Promise<{ data: Item }> {
  const response = await fetch(`${API_URL}/api/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    throw new Error('Failed to create item');
  }

  return response.json();
}
