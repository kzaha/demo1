// Файл: api/parse.js
// Загрузи его в свой репозиторий на GitHub ИМЕННО в папку "api" (создай папку api, если её нет),
// чтобы Vercel сам превратил его в отдельный веб-адрес: https://твой-сайт.vercel.app/api/parse
//
// Он делает одну вещь: принимает от сайта фото + текст-инструкцию,
// сам обращается к Anthropic (с секретным ключом, который лежит в настройках Vercel,
// а не в этом файле), и отдаёт сайту ответ.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Разрешён только POST-запрос' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'На сервере не настроен ANTHROPIC_API_KEY (Environment Variable в Vercel)' });
  }

  try {
    const { prompt, imageBase64, imageType } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: 'Не передан prompt' });
    }

    // Собираем сообщение: если есть фото — добавляем его картинкой, плюс текст-инструкция
    const content = [];
    if (imageBase64) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageType || 'image/jpeg',
          data: imageBase64,
        },
      });
    }
    content.push({ type: 'text', text: prompt });

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content }],
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      return res.status(anthropicResponse.status).json({ error: data });
    }

    // Собираем весь текстовый ответ модели в одну строку
    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Неизвестная ошибка сервера' });
  }
}

// Увеличиваем лимит на размер тела запроса, чтобы влезало фото
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
