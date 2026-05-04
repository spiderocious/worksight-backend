import dotenv from 'dotenv';
dotenv.config();

const required = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
};

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  MONGO_URI: required('MONGO_URI', 'mongodb://127.0.0.1:27017/worksight'),
  JWT_SECRET: required('JWT_SECRET', 'worksight-dev-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  CANDIDATE_TOKEN_EXPIRES_IN: process.env.CANDIDATE_TOKEN_EXPIRES_IN ?? '30d',

  // Surfaced by GET /api/public/downloads for the marketing landing page and
  // candidate invite pages. Update via env on deploy.
  //
  // The primary install method is the curl one-liner — no DMG, no Homebrew,
  // no signing required. The script lives in the worksight-electron repo and
  // is fetched at install time via the raw GitHub URL below.
  DOWNLOAD_INSTALL_COMMAND:
    process.env.DOWNLOAD_INSTALL_COMMAND ??
    'curl -fsSL https://raw.githubusercontent.com/spiderocious/worksight-electron-app/main/install.sh | bash',
  DOWNLOAD_INSTALL_SCRIPT_URL:
    process.env.DOWNLOAD_INSTALL_SCRIPT_URL ??
    'https://raw.githubusercontent.com/spiderocious/worksight-electron-app/main/install.sh',
  DOWNLOAD_RELEASES_URL:
    process.env.DOWNLOAD_RELEASES_URL ??
    'https://github.com/spiderocious/worksight-electron-app/releases',
  DOWNLOAD_LATEST_VERSION: process.env.DOWNLOAD_LATEST_VERSION ?? '0.1.0',
  DOWNLOAD_RELEASED_AT: process.env.DOWNLOAD_RELEASED_AT ?? new Date().toISOString(),
};
