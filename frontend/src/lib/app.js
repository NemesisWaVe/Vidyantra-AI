const API_ENDPOINT = 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/generate';

export async function generateContent(userId, query, userProfile) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        query: query,
        grade_level: userProfile.grade,
        board: userProfile.board
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}