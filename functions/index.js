const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

exports.phronesApiProxy = functions
    .runWith({
        secrets: [
            "GEMINI_API_KEY",
            "BRAPI_TOKEN",
            "POLYGON_API_KEY",
            "NEWS_API_KEY",
            "ALPHA_VANTAGE_API_KEY"
        ],
        timeoutSeconds: 60,
        memory: "256MB"
    })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "Acesso negado. Autenticação necessária."
            );
        }

        const { action, payload } = data;

        try {
            switch (action) {
                case "getMarketData":
                    const brapiRes = await axios.get(`https://brapi.dev/api/quote/${payload.ticker}?token=${process.env.BRAPI_TOKEN}`);
                    return brapiRes.data;

                case "getGlobalData":
                    const polyRes = await axios.get(`https://api.polygon.io/v2/last/nbbo/${payload.ticker}?apiKey=${process.env.POLYGON_API_KEY}`);
                    return polyRes.data;

                case "getMarketNews":
                    const newsRes = await axios.get(`https://newsapi.org/v2/everything?q=${payload.ticker}&apiKey=${process.env.NEWS_API_KEY}`);
                    return newsRes.data.articles.slice(0, 5);

                case "callGeminiCoach":
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                    const response = await axios.post(geminiUrl, {
                        contents: [{
                            parts: [{
                                text: payload.prompt || `Analise este cenário de investimento: ${JSON.stringify(payload.tradeData)}`
                            }]
                        }]
                    });
                    return response.data.candidates[0].content.parts[0].text;

                default:
                    throw new functions.https.HttpsError("invalid-argument", "Ação desconhecida.");
            }
        } catch (error) {
            console.error("Erro na Phrones API:", error.message);
            throw new functions.https.HttpsError("internal", error.message);
        }
    });