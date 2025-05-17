const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const port = 3000;

app.use(express.json());

app.post("/ask-doctor", async (req, res) => {
  const question = req.body.question;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!question) {
    return res.status(400).json({ error: "الرجاء إرسال السؤال في جسم الطلب." });
  }

  const systemPrompt = `
أنت طبيب عام ذكي ومدرب تدريبًا عاليًا على فهم التحاليل الطبية، تقارير الأشعة مثل MRI، وقراءات المختبرات المختلفة. مهمتك هي تحليل ما يرسله المستخدم سواء كان:
- سؤال طبي مباشر.
- تقرير تحليل دم أو بول أو غيره.
- صورة أو تقرير أشعة (MRI، CT، X-ray).
- وصف أعراض يعاني منها المستخدم.

عند تلقي أي مدخل، عليك الرد بطريقة دقيقة، شاملة، ومنظمة، وتتضمن التالي:

1. تحليل دقيق للبيانات المقدمة.
2. الاحتمالات التشخيصية المحتملة بناءً على البيانات (خصوصًا الأمراض النادرة).
3. شرح تفصيلي لكل احتمال، يشمل:
   - التعريف بالمرض.
   - الأسباب.
   - الأعراض.
   - الفحوصات اللازمة للتأكيد.
   - العلاجات الممكنة.
4. التنبيه إذا كانت الحالة تحتاج لطبيب متخصص.

تذكر: يجب أن تكون لغتك الطبية دقيقة، ومنظمة، وسهلة الفهم للمستخدم غير المختص، وأن تكون مستندًا إلى الطب المبني على الأدلة.

ابدأ كل إجابة بعنوان واضح، واتبع تنسيقًا مرتبًا واحترافيًا.
`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "nousresearch/deephermes-3-mistral-24b-preview:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.status(200).json({ answer: response.data.choices[0].message.content });
  } catch (err) {
    console.error("API Error:", err.response ? err.response.data : err.message);
    res.status(500).json({
      error: err.response ? err.response.data : err.message
    });
  }
});


app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
