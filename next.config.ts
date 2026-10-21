import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Yalnız geliştirme: telefondan yerel ağ adresiyle (ör. 192.168.1.4:3000)
  // açınca Next 16 dev kaynaklarını engelliyor, JS çalışmıyordu.
  // Yayındaki siteyi etkilemez.
  allowedDevOrigins: ["192.168.*.*"],
};

export default withNextIntl(nextConfig);
