import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json());

// ログインAPI
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@example.com' && password === 'password123') {
    res.json({ success: true, user: { id: 1, name: '管理者', email } });
  } else {
    res.status(401).json({ success: false, message: '認証失敗' });
  }
});

// Gemini連携API（参考用）
app.post('/api/chat', async (req, res) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  // ここにAIの処理を書く
  res.json({ message: "AI function ready" });
});

// Vercel用のエクスポート（ここが重要！）
export default app;
