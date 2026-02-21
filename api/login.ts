import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password } = req.body;

  // 救急モード：APIキーに関わらず、固定のパスワードでログイン許可
  if (email === 'admin@example.com' && password === 'password123') {
    return res.status(200).json({
      success: true,
      user: { id: 1, name: '管理者', email: 'admin@example.com' }
    });
  }

  return res.status(401).json({ success: false, message: '認証失敗' });
}
