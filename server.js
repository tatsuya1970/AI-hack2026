import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 不正解時の煽り文句を生成
app.post('/api/taunt', async (req, res) => {
  const { background, hidden, attempts } = req.body;
  const fallbacks = [
    '目は開いているか？',
    '煩悩が邪魔しているぞ...',
    'まだまだじゃ。修行が足りぬ。',
    '執着を捨てよ。',
    '迷える子羊よ...',
    '雑念が多すぎる。',
    '心を無にせよ。',
  ];
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `あなたは厳しくて少しユーモアのある禅マスターです。プレイヤーが「${background}」の中から「${hidden}」を${attempts}回も見つけられませんでした。短い煽り文句を1文だけ日本語で言ってください。禅語録風で、面白く、辛辣に。句点で終わること。`
      }]
    });
    res.json({ comment: message.content[0].text.trim() });
  } catch {
    res.json({ comment: fallbacks[Math.floor(Math.random() * fallbacks.length)] });
  }
});

// クリア後の悟り診断を生成
app.post('/api/diagnosis', async (req, res) => {
  const { totalTime, totalMistakes, stagesCleared } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `禅マスターとして、「ZENをさがせ！」ゲームのプレイヤーを診断してください。
クリア面数: ${stagesCleared}面
合計時間: ${totalTime}秒
合計ミス: ${totalMistakes}回

悟り度スコア（100点満点）と短い診断コメントをJSON形式のみで返してください。他の文章は不要です。
{"score": 数字, "comment": "コメント文"}`
      }]
    });
    const text = message.content[0].text;
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      res.json(JSON.parse(match[0]));
    } else {
      throw new Error('parse error');
    }
  } catch {
    const score = Math.max(5, 100 - totalMistakes * 4 - Math.floor(totalTime / 8));
    res.json({ score, comment: '修行の道はまだ続く...' });
  }
});

// AIによる新しい漢字ペア生成
app.post('/api/kanji-pair', async (req, res) => {
  const { usedBackgrounds } = req.body;
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `「ZENをさがせ！」ゲーム用の漢字ペアを1つ生成してください。
条件：
- 背景文字は「禅」または「善」と字形が似ていて見間違えやすい漢字1文字
- 隠れ文字は「禅」または「善」のどちらか
- 既に使用済みの背景文字は避けてください: ${JSON.stringify(usedBackgrounds)}
JSON形式のみで返してください: {"background": "漢字", "hidden": "禅 or 善", "title": "○を見つけよ"}`
      }]
    });
    const text = message.content[0].text;
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      res.json(JSON.parse(match[0]));
    } else {
      throw new Error('parse error');
    }
  } catch {
    res.json({ background: '全', hidden: '禅', title: '禅を見つけよ' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nZENをさがせ！が起動しました`);
  console.log(`http://localhost:${PORT} を開いてください\n`);
});
