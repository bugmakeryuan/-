import fs from 'fs';

try {
  // 1. 读取文本文件
  const rawData = fs.readFileSync('auth_codes.txt', 'utf-8');

  // 2. 按换行符分割，去除首尾空格，并过滤掉空行
  const codes = rawData
    .split(/\r?\n/)
    .map(code => code.trim())
    .filter(code => code.length > 0);

  // 3. 映射成 Cloudflare KV 需要的数组格式
  const kvData = codes.map(code => ({
    key: code,
    value: "unused"
  }));

  // 4. 写入到 data.json
  fs.writeFileSync('data.json', JSON.stringify(kvData));

  console.log(`✅ 转换成功！共处理了 ${kvData.length} 个授权码，已生成 data.json`);
} catch (error) {
  console.error('❌ 发生错误：请确保 auth_codes.txt 文件和本脚本在同一目录下。', error.message);
}