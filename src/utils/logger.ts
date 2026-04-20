export class Logger {
  private static getTimestamp(): string {
    return new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour12: false,
    });
  }

  static log(message: string, ...args: any[]) {
    console.log(`[${this.getTimestamp()}] ${message}`, ...args);
  }

  static info(message: string, ...args: any[]) {
    console.info(`[${this.getTimestamp()}] INFO: ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`[${this.getTimestamp()}] WARN: ${message}`, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(`[${this.getTimestamp()}] ERROR: ${message}`, ...args);
  }
}
