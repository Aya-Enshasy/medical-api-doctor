const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// ترجمة مجانية باستخدام LibreTranslate
async function translateText(text, sourceLang, targetLang) {
  try {
    const res = await axios.post(
      "https://translate.argosopentech.com/translate",
      {
        q: text,
        source: sourceLang,
        target: targetLang,
        format: "text"
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );
    return res.data.translatedText;
  } catch (error) {
    console.error("Translation Error:", error.message);
    return text; // fallback: return original text if translation fails
  }
}

app.post("/ask-doctor", async (req, res) => {
  const question = req.body.question;
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

  if (!question) {
    return res.status(400).json({ error: "الرجاء إرسال السؤال في جسم الطلب." });
  }

  if (!HF_API_KEY) {
    return res.status(500).json({ error: "مفتاح API الخاص بـ Hugging Face غير موجود." });
  }

  try {
    // 1. ترجمة السؤال من العربي إلى الإنجليزي
    const translatedQuestion = await translateText(question, "ar", "en");
    console.log("Translated question:", translatedQuestion);

    // 2. بناء البرومبت
    const prompt = `
You are a highly trained general physician skilled in interpreting medical tests, imaging reports such as MRI, and various lab results. Your task is to analyze any input sent by the user, which may include:
- A direct medical question.
- Blood, urine, or other lab test reports.
- An image or imaging report (MRI, CT, X-ray).
- A description of symptoms the user is experiencing.

User Input: ${translatedQuestion}

Upon receiving any input, respond in a precise, comprehensive, and organized manner including the following:

1. Accurate analysis of the provided data.
2. Possible diagnostic considerations based on the data (especially rare diseases).
3. A detailed explanation for each possible diagnosis, including:
   - Definition of the disease.
   - Causes.
   - Symptoms.
   - Tests required to confirm the diagnosis.
   - Possible treatments.
4. A warning if the case requires a specialist consultation.

Remember: your medical language should be accurate, organized, and easy to understand for a non-expert user, based on evidence-based medicine.

Start every answer with a clear title and follow a neat and professional formatting.`;

    // 3. إرسال إلى موديل هاجنغ فيس الصحيح
    const response = await axios.post(
     "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7
        }
      },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Hugging Face response:", response.data);

    // محاولة استخراج النص الناتج اعتمادًا على الشكل المتوقع
    let answerInEnglish = "";

    if (response.data.generated_text) {
      // بعض الموديلات ترجع بهذا الشكل
      answerInEnglish = response.data.generated_text;
    } else if (Array.isArray(response.data) && response.data[0]?.generated_text) {
      // البعض يرجع مصفوفة
      answerInEnglish = response.data[0].generated_text;
    } else {
      answerInEnglish = "لم يتم تلقي رد من الموديل.";
    }

    console.log("Answer in English:", answerInEnglish);

    // 4. ترجمة الرد إلى العربية
    const answerInArabic = await translateText(answerInEnglish, "en", "ar");

    res.status(200).json({ answer: answerInArabic });

  } catch (err) {
    console.error("API Error:", err.response ? err.response.data : err.message);
    res.status(500).json({
      error: err.response ? err.response.data : err.message
    });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
