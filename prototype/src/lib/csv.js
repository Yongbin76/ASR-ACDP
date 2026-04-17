/**
 * 功能：解析简单 CSV 文本为对象数组。
 * 输入：`text`，原始 CSV 字符串内容。
 * 输出：按表头映射后的行对象数组。
 */
function parseCsv(text) {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (ch === '\r') {
      continue;
    }
    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows.shift().map((value) => value.trim());
  return rows
    .filter((current) => current.some((value) => String(value || '').trim() !== ''))
    .map((current) => {
      const item = {};
      for (let i = 0; i < headers.length; i += 1) {
        item[headers[i]] = String(current[i] || '').trim();
      }
      return item;
    });
}

module.exports = {
  parseCsv,
};
