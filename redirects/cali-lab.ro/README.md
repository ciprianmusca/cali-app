# Redirect cali-lab.ro → cali-lab.app

Domeniul vechi e pe **alt server**. Pune fișierele din acest folder în **document root** (unde e acum `http://cali-lab.ro/`).

## 1. HTML (merge pe orice hosting)

Copiază `index.html` în root. Vizitele pe `http://cali-lab.ro/` ajung pe `https://cali-lab.app/`, păstrând calea dacă e cazul.

## 2. Apache (`.htaccess`) — preferat dacă ai Apache

Creează `.htaccess` în root:

```apache
RewriteEngine On
RewriteRule ^(.*)$ https://cali-lab.app/$1 [R=301,L]
```

## 3. Nginx

```nginx
server {
  listen 80;
  server_name cali-lab.ro www.cali-lab.ro;
  return 301 https://cali-lab.app$request_uri;
}
```

## 4. PHP (dacă root-ul rulează PHP)

`index.php`:

```php
<?php
header('Location: https://cali-lab.app' . ($_SERVER['REQUEST_URI'] ?? '/'), true, 301);
exit;
```

---

**Recomandare:** 301 pe server (Apache/Nginx/PHP). HTML e doar fallback când nu ai acces la config.

După ce redirectul merge, poți lăsa domeniul pe vechiul host doar pentru redirect, sau îl muți ulterior pe Cloudflare lângă `cali-lab.app`.
