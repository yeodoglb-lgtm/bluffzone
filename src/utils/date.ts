import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.locale('ko');

export { dayjs };

export function today(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function formatDate(date: string, fmt = 'YYYY년 M월 D일 (ddd)'): string {
  return dayjs(date).format(fmt);
}

export function formatTime(ts: string | null): string {
  if (!ts) return '';
  return dayjs(ts).format('HH:mm');
}

export function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  const mins = dayjs(end).diff(dayjs(start), 'minute');
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  return {
    start: start.format('YYYY-MM-DD'),
    end: start.endOf('month').format('YYYY-MM-DD'),
  };
}

export function weekRange(date: string): { start: string; end: string } {
  const d = dayjs(date);
  return {
    start: d.startOf('isoWeek').format('YYYY-MM-DD'),
    end: d.endOf('isoWeek').format('YYYY-MM-DD'),
  };
}

export function quarterRange(date: string): { start: string; end: string } {
  const d = dayjs(date);
  return {
    start: d.startOf('quarter').format('YYYY-MM-DD'),
    end: d.endOf('quarter').format('YYYY-MM-DD'),
  };
}

export function yearRange(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}
