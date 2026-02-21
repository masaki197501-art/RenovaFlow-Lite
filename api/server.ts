import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@example.com' && password === 'password123') {
    res.status(200).json({ success: true, user: { id: 1, name: '管理者' } });
  } else {
    res.status(401).json({ success: false, message: '認証失敗' });
  }
});

// その他のリクエストはすべて404を返す
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

export default app;
