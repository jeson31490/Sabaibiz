// Metro config: the mobile app reuses the website's data code in ../lib (invoices, sales, periods…)
// so both apps read and save data exactly the same way.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const libDir = path.resolve(__dirname, "..", "lib");
const mobileSupabase = path.resolve(__dirname, "src", "supabase.ts");

config.watchFolders = [...(config.watchFolders ?? []), libDir];

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;

  // "@shared/invoices" -> ../lib/invoices
  if (moduleName.startsWith("@shared/")) {
    return resolve(context, path.join(libDir, moduleName.slice("@shared/".length)), platform);
  }

  // The website's lib/supabase.ts reads NEXT_PUBLIC_* variables and uses browser storage.
  // Inside ../lib, swap it for the mobile client (AsyncStorage session, EXPO_PUBLIC_* variables).
  const from = context.originModulePath ?? "";
  if (moduleName === "./supabase" && from.startsWith(libDir + path.sep)) {
    return { type: "sourceFile", filePath: mobileSupabase };
  }

  return resolve(context, moduleName, platform);
};

module.exports = config;
