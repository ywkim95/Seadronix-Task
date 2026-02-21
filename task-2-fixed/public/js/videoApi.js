export const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024;

async function readJsonResponse(response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error('서버 응답(JSON)을 처리할 수 없습니다.');
  }
}

export async function listVideos() {
  const response = await fetch('/api/videos');

  if (!response.ok) {
    throw new Error('비디오 목록을 불러오지 못했습니다.');
  }

  return response.json();
}

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append('video', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(payload.error || '업로드에 실패했습니다.');
  }

  return payload;
}
