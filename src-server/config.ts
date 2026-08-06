import path from 'path'

const isDev = process.env.NODE_ENV !== 'production'
const port = process.env.PORT || 3000

const rootDir = process.cwd()

export const config = {
  isDev,
  port,
  siteUrl: (process.env.SITE_URL || 'https://bad-at-coding.com').replace(
    /\/$/,
    ''
  ),
  siteName: 'bad at coding',
  paths: {
    root: rootDir,
    dist: path.resolve(rootDir, 'dist'),
    views: path.resolve(rootDir, 'views'),
  },
}
