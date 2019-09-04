export async function http() {
  const request = await fetch(...arguments);

  if (!request.ok) {
    throw request;
  }

  const response = await request.json();

  return response;
}
