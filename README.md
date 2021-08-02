# Outpost

Blogging platform built on top of Hive and Hive-Engine, connected to a customizable reward pool to link people with a common interest. Outposts also include an NFT marketplace, own DTF, and Diesel Pool.

## Getting Ready

- Create a Hive-Engine token (https://tribaldex.com/tokens/create)
- You may enable Staking, Delegation token (https://tribaldex.com/tokens/manage)
- Create a reward pool for your token (https://tribaldex.com/smt/manage)
- Fill out the form to set up Outpost on your domain (https://tribaldex.com/smt/outpost)

If you already have SCOT Bot setup for your token and want to migrate, just fill out the form here https://tribaldex.com/smt/outpost.

If you need help with any steps of the process, visit our discord https://discord.gg/xWRYB9s.

## Configuration

All the configurable values are in the `config.js` file. Feel free to change them as needed.

We are using SCSS for styling. You can find them in the `assets/scss` folder.

To change the default link preview image (`cover.png`), favicon (`favicon.ico`), and logo (`logo.png`), replaces the files in the `static` folder.

## Environment Variables

`NODE_ENV` - For production, please set it to `production`, for development set it to `development`

`APP_DOMAIN` - Domain name of your Outpost instance. For development, it could be - http://localhost:8080

`SESSION_SECRET` - A password like string to encrypt user session. If you have Node JS installed you can generate one using this command - `node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"`

`HS_API_KEY` - HiveSearcher API key if you want to use search powered by HiveSearcher. Docs are available at https://hivesearcher.com/api-docs. (not in use)

## Build Setup

### Install dependencies

```bash
$ npm install
```

### Serve with hot reload at localhost:8080

```bash
$ npm run dev
```

### Build for production and launch server

```bash
$ npm run build
$ npm run start
```
