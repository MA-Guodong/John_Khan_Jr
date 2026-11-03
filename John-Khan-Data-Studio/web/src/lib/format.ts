/** 后端时间形如 `2024-01-19 11:00:00`，按本地时间解析，避免时区跳变。 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [datePart = '', timePart = '00:00:00'] = value.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, hour, minute, second);
}

const pad = (input: number) => String(input).padStart(2, '0');

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDotDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('zh-CN').format(value);
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

export function spanLabel(days: number): string {
  if (days < 31) return `${days} 天`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} 个月`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} 年 ${rest} 个月` : `${years} 年`;
}

export function weekdayLabel(weekday: number): string {
  return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][weekday - 1] ?? '';
}

export function monthLabel(month: string): string {
  const [year, value] = month.split('-');
  return `${year}.${value}`;
}
