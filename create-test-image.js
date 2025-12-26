// Node.jsでテスト画像を作成（SVGをPNGに変換せず、SVGのまま使用）
const fs = require('fs');

// SVG画像を作成（100x100の青い円）
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#3B82F6" />
  <text x="50" y="60" text-anchor="middle" fill="white" font-size="40" font-family="Arial">T</text>
</svg>`;

fs.writeFileSync('test-image.svg', svg);
console.log('✅ テスト画像を作成しました: test-image.svg');
