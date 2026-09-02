export class DateUtils {
  static todayIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  static nowIso(): string {
    return new Date().toISOString();
  }

  static plusDays(days: number, fromDate = new Date()): string {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  static minusDays(days: number, fromDate = new Date()): string {
    const d = new Date(fromDate);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  static formatCustom(date: Date, format: string): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return format.replace('YYYY', String(yyyy)).replace('MM', mm).replace('DD', dd);
  }
}
