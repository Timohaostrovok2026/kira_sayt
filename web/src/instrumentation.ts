// Next вызывает register() один раз при старте сервера.
export async function register() {
  // Только боевой сервер: в next dev локальные тестовые заявки не должны уходить в группу.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    // Досылка заявок, которые не дошли до Telegram с первого раза.
    const { startResendLoop } = await import("@/lib/leads");
    startResendLoop();
  }
}
