# ToolsPro

ToolsPro is a collection of free online tools that anyone can use without an account. It is a full-stack TypeScript project: a React front end and a Node.js/Express back end with MongoDB.

Most tools run entirely in the browser, so the files and text you enter stay on your device. A few tools need the server (for example looking up an IP address, converting Office files to PDF, or creating a short link). Each tool page states which of the two applies.

## Features

- Free tools with no sign-up and no paid third-party APIs.
- Browser-only tools that process data locally.
- Server-assisted tools for jobs a browser cannot do alone:
  - Office documents (Word, Excel, PowerPoint) to PDF through LibreOffice.
  - IP address location lookup using an offline database.
  - URL shortener with links that expire after one year.
- Contact form that stores messages in MongoDB.
- Strict TypeScript on both the client and the server, with automated tests.

## Tech stack

| Part | Technology |
| --- | --- |
| Client | React 19, Vite, TypeScript (strict), Tailwind CSS v4 |
| Server | Node.js, Express 5, TypeScript, Zod, express-rate-limit, Helmet, CORS |
| Database | MongoDB with Mongoose |
| Tests | Vitest, Supertest |
| Office to PDF | LibreOffice (headless) |
| IP lookup | DB-IP City Lite database read with the `maxmind` package |

## Project structure

```text
toolspro/
├── client/   # React app (Vite)
│   └── src/
│       ├── components/
│       ├── lib/             # logic used by the tools, with tests
│       └── pages/tools/     # one file per tool, plus registry.ts
└── server/   # Express API
    ├── src/
    │   ├── config/          # environment and database connection
    │   ├── controllers/
    │   ├── data/tools.ts    # the list of tools and their status
    │   ├── middleware/
    │   ├── models/
    │   ├── routes/
    │   ├── services/
    │   └── utils/
    ├── scripts/             # for example the IP database updater
    └── tests/
```

A tool is shown on the website only when its `status` in `server/src/data/tools.ts` is `active`. Its page content is registered in `client/src/pages/tools/registry.ts` under the same slug.

## Requirements

- Node.js (a current LTS version) and npm
- MongoDB: a local instance or a MongoDB Atlas cluster
- LibreOffice, only if you want the Office to PDF tools to work
  - Linux packages: `libreoffice-writer libreoffice-calc libreoffice-impress fonts-liberation fonts-dejavu`
  - If `soffice` is not on your PATH, set `SOFFICE_PATH` (see below).

## Getting started

```bash
git clone <your-repository-url>
cd toolspro

# server
cd server
npm install
cp .env.example .env      # on Windows PowerShell: Copy-Item .env.example .env
# edit .env (see Environment variables)

# client
cd ../client
npm install
```

Start both parts in two terminals. The exact script names are in each `package.json`; typically:

```bash
# terminal 1
cd server
npm run dev

# terminal 2
cd client
npm run dev
```

The client dev server proxies `/api` and `/s` to the back end (port 5000). The proxy is set in `client/vite.config.ts`. Restart the client dev server after changing it.

## Environment variables

Copy `server/.env.example` to `server/.env` and fill it in. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string, including the database name |
| `SOFFICE_PATH` | Optional. Full path to LibreOffice's `soffice` if it is not on the PATH |

Other variables, such as the port and allowed origins, are listed in `server/.env.example`.

Example connection string format (replace the placeholders; encode special characters in the password):

```text
mongodb+srv://<username>:<password>@<cluster-host>/toolspro?retryWrites=true&w=majority
```

If the database is not reachable, the tools that do not need it keep working; the contact form and the URL shortener report that the service is not available.

## IP location database

The IP lookup tool reads a local DB-IP City Lite database file. Download it with:

```bash
cd server
npm run geoip:update
```

Run the same command about once a month and restart the server so the new file is used.

IP geolocation data is provided by [DB-IP](https://db-ip.com) under the Creative Commons Attribution 4.0 licence. The attribution link "IP Geolocation by DB-IP" must stay visible on the tool page.

## Testing and quality checks

Run these before every commit and before a deployment:

```bash
# server
cd server
npx tsc --noEmit
npm test
npm run build

# client
cd ../client
npx tsc -b
npm run lint
npm test
npm run build
```

The server test for the tools list checks the number of active tools, so update `server/tests/tools.test.ts` when you activate or deactivate a tool.

## Adding a new tool

1. Add the tool to `server/src/data/tools.ts` with `status: "planned"`.
2. Write its logic in `client/src/lib/...` with tests (and server code in `server/src/...` if it needs the server).
3. Create the page in `client/src/pages/tools/` and register it in `registry.ts`, using the same slug, with `howTo` steps and `limitations`.
4. Change its status to `active`, update the count in `tools.test.ts`, and run the checks above.

## API overview

All API routes are under `/api`, except short-link redirects.

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | Health check |
| `POST /api/short` | Create a short link (`{ "url": "..." }`) |
| `GET /s/:code` | Redirect a short link to its address |
| `POST /api/convert/...` | Convert an uploaded Office file to PDF |

Other routes (contact form, web and network tools) are defined in `server/src/routes/`.

Errors use one shape:

```json
{ "success": false, "error": { "code": "INVALID_URL", "message": "..." } }
```

## Deployment notes

These points need attention when running behind a reverse proxy such as Nginx on a VPS:

- Set `app.set("trust proxy", 1)` so rate limits use the visitor's IP address.
- Send the original host: `proxy_set_header Host $host;`.
- Forward short links to the server, for example `location ~ ^/s/[A-Za-z0-9]{4,32}$ { proxy_pass http://127.0.0.1:<port>; }`.
- Office uploads can be up to 15 MB: use `client_max_body_size 16m;` and a `proxy_read_timeout` of about 90 seconds.
- Install LibreOffice and fonts on the server (see Requirements).
- Never expose MongoDB's port 27017 to the internet. With Atlas, allow only the server's IP address.
- Keep secrets only in the server's `.env`, and serve the site over HTTPS.
- Run the Node process under a process manager (for example PM2) so it restarts after a crash or reboot.

## Privacy

- Browser-only tools do not send your input to the server.
- Server-assisted tools send only what the job needs: an IP address for a lookup, an uploaded file for conversion (processed and deleted), or a web address for a short link.
- Short-link addresses are stored until the link expires (one year). Do not shorten addresses that contain private information.
- Review the website's Privacy Policy and Terms before publishing; update them when a feature that handles data changes.

## Contributing

Open an issue to discuss a change before sending a large pull request. Keep the TypeScript strict settings, add tests for new logic, and make sure the checks in "Testing and quality checks" pass.

