# Blog patch v2: ToolsPro + thesourcefull.com

Ye patch aap ke **apne** blog backend (Post, Term, admin) ke saath kaam karta hai. WordPress ke 1,664 posts aap ke `Post`/`Term` mein import hote hain (to admin mein bhi nazar aayenge), aur purane WordPress URL (`/slug/`, `/category/x/`, `/sitemap.xml`, `/rss.xml`, images) SEO ke liye Express khud banata hai.

Aap ki purani cheezein (`/api/blog`, `/api/admin`, tools) waise hi rehti hain. Is zip mein ye badla hai:
- **Nayi files:** `src/blog/*`, `src/models/Page.ts`, 6 nayi test files.
- **Aap ki 3 files mein chhoti tabdeeli:** `src/app.ts` (2 line), `package.json` (1 script + 1 package), `src/models/Post.ts` (sirf naye optional fields, purane fields waise hi).

---

## Hissa A: Git saaf karna (pehle ye)

Aap ka git ek adhoora rebase mein atka hai. Pehle usay theek karte hain. Aap ke 6 commits `backup-main` branch mein mehfooz hain.

```powershell
cd C:\Projects\Project\toolspro
git branch
```
List mein `backup-main` dikhna chahiye.

**A1. Purane (v1) blog ki files hataein** (backup `C:\Projects\blog-backup` mein hai, ye sirf hata rahi hain):
```powershell
New-Item -ItemType Directory -Force C:\Projects\blog-backup\v1-moved | Out-Null
Move-Item server\src\blog C:\Projects\blog-backup\v1-moved\blog
Move-Item server\src\models\Post.ts C:\Projects\blog-backup\v1-moved\Post.ts
Move-Item server\tests\blogContent.test.ts,server\tests\blogRoutes.test.ts,server\tests\blogSpa.test.ts,server\tests\wxr.test.ts C:\Projects\blog-backup\v1-moved\
```

**A2. Rebase band karein:**
```powershell
git rebase --abort
git status
git --no-pager log --oneline -3
```
`On branch main` aur log mein sab se upar `25a9f12 aa` aana chahiye.

**A3. Nayi saaf branch banayein.** 6 commits ko ek commit bana kar GitHub ki history ke upar rakhte hain (is se 127 MB wali file history mein nahi jati):
```powershell
$base = git merge-base main origin/main
git --no-pager log --oneline -1 $base
git switch -c blog-deploy main
git reset --soft $base
git commit -m "Latest tools, URL shortener, Office to PDF and blog backend"
git merge --no-edit origin/main
git --no-pager log --oneline -4
```
Agar `merge` mein README par conflict aaye to ruk jayein aur `git status` ka output bhej dein.

---

## Hissa B: Patch lagana

**B1. Zip extract karein** (`toolspro` folder mein, `server` mein nahi):
```powershell
Expand-Archive -Path "C:\Users\Hp\Downloads\toolspro-blog-patch-v2.zip" -DestinationPath C:\Projects\Project\toolspro -Force
```
Zip jahan download hui hai wahan ka path likhein. Is se `server\src\blog` banega, aur `BLOG-APPLY.md` (ye file) `toolspro` mein aa jayegi.

**B2. Package install:**
```powershell
cd C:\Projects\Project\toolspro\server
npm install
```

**B3. Check:**
```powershell
npx tsc --noEmit
npm test
```
Koi error nahi, aur sab tests `passed`.

---

## Hissa C: WordPress ka data import

Pehle dry-run (DB mein kuch nahi likhta):
```powershell
npm run import:wp -- --file="C:\Users\Hp\Downloads\thesourcefull.WordPress.2026-11-19.xml" --dry-run
```
Phir asal import. **Is baar `--reset` lagana zaroori hai**, kyunke Atlas mein pichle (purane tareeqe wale) 1,672 records pade hain. `--reset` sirf wahi hataata hai jo WordPress se aaye the (jin mein `wpId` hai). Aap ke apne admin se likhe posts ko haath nahi lagata.
```powershell
npm run import:wp -- --file="C:\Users\Hp\Downloads\thesourcefull.WordPress.2026-11-19.xml" --reset
```
Aakhir mein: `DB mein ab: WordPress posts 1664, pages 8, categories 39, tags 895`.

Baad mein dobara chalayein to pehle se import hue posts ko chhedta nahi. Unhein WordPress ki halat par wapas likhna ho to `--update` lagayein (is se admin ki edits mit jati hain).

---

## Hissa D: Local par dekhna

`.env` ke sab se neeche ye 3 line jodein (purani lines na chhedein):
```
SITE_URL=http://localhost:5000
SITE_NAME=The Source Full
UPLOADS_DIR=C:\Users\Hp\Downloads\Files\domains\thesourcefull.com\public_html\wp-content\uploads
```
```powershell
npm run dev
```
Dekhein:
- http://localhost:5000/blog/
- http://localhost:5000/how-to-get-a-farther-work-with-no-experience/
- http://localhost:5000/category/technology/
- http://localhost:5000/sitemap.xml
- http://localhost:5000/api/blog/posts (aap ki API mein bhi ab WordPress ke posts)

---

## Hissa E: GitHub par bhejna

```powershell
cd C:\Projects\Project\toolspro
git add server/src server/tests server/package.json server/package-lock.json
git status
```
`git status` mein `dbip-city-lite.mmdb` ya `.env` **nahi** dikhna chahiye. Phir:
```powershell
git commit -m "Add WordPress blog import and SEO pages"
git push -u origin blog-deploy
```
VPS par isi `blog-deploy` branch ko clone karenge.

---

## Hissa F: VPS ke liye yaad rakhein

- `.env` (VPS par): `NODE_ENV=production`, `MONGODB_URI`, `CLIENT_ORIGINS`, `ADMIN_SESSION_SECRET`, `SITE_URL`, `SITE_NAME`, `UPLOADS_DIR`, `CLIENT_DIST_DIR`.
- 127 MB wali `dbip-city-lite.mmdb` GitHub par nahi jati. VPS par `npm run geoip:update` se download hogi.
- Nginx: sab kuch Express ko proxy karein, `client_max_body_size 16m;` aur `proxy_read_timeout 90;`.
- React mein naya page jodein to `src/blog/spa.ts` ki `SPA_ROUTES` list mein bhi jodein.

---

## Dhyan rakhne wali baatein

1. **Admin se edit:** aap ka editor HTML saaf karta hai (iframe, class, style hata deta hai). WordPress ke jin posts mein YouTube video (iframe) hai, unhein admin se edit kar ke save karenge to video hat jayegi. Sirf padhne par koi farq nahi.
2. **Extra categories:** WordPress ke posts mein kai categories thi, aap ke model mein ek `category` hai. Asal category `category` mein hai, baaqi `categories` mein (taake purane `/category/x/` pages mein posts rahein). Admin se category badlen to puraani extra categories bhi rehti hain.
3. **Slug wale 2 posts:** 2 posts ke slug mein `_` ya gair-angrezi harf hain. Wo SEO pages par chalte hain, lekin aap ki `/api/blog/posts/:slug` API unhein nahi dikhati (wahan sirf `a-z0-9-` slug chalte hain).
4. **Pages:** WordPress ke pages (write-for-us, disclaimer waghera) sirf `/<slug>/` par dikhte hain, admin mein nahi. `about`, `contact-us`, `privacy-policy`, `terms-and-conditions` React ke pages se badle jate hain.
5. **`/category/:slug` ka takraav:** pehle blog ki category dhoondi jati hai, na mile to React wala page khulta hai.
6. Secret (`.env`, password, connection string) kisi ko na bhejein.
