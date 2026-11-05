// Kullanıcının düzeltebileceği durum (yanlış alan, kural ihlali).
export class UserError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Cloudflare ya da Resend isteği başarısız oldu; işlem yeniden denenebilir.
export class ServiceError extends Error {
  constructor(message) {
    super(message);
    this.status = 502;
  }
}
