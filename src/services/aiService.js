const SYSTEM_PROMPT = `Ты помощник для семейного списка покупок. Из текста пользователя извлеки продукты.
Верни ТОЛЬКО валидный JSON-массив без markdown и пояснений:
[{"name": "название", "quantity": "количество или вес", "category": "категория"}]

Категории: "Овощи и фрукты", "Молочные продукты", "Мясо и рыба", "Бакалея", "Напитки", "Заморозка", "К чаю / Сладости", "Бытовая химия", "Прочее".
Если количество не указано — "1 шт".`;

export async function parseProductsWithAI(text) {
  const apiKey = import.meta.env.VITE_AI_API_KEY;
  const apiUrl = import.meta.env.VITE_AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('Не задан VITE_AI_API_KEY в .env');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Пустой ответ от AI');

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

  if (!Array.isArray(parsed)) {
    throw new Error('AI вернул не массив');
  }

  return parsed.map((item) => ({
    name: String(item.name || '').trim(),
    quantity: String(item.quantity || '1 шт').trim(),
    category: String(item.category || 'Прочее').trim(),
  })).filter((item) => item.name);
}
