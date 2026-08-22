import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // API route'ları, Next dahili yolları ve dosya uzantılı statik varlıkları
  // locale routing'in dışında tut.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
