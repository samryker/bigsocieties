# Rentals Frontend

Static listing website for the Rentals backend. The Flutter web app can use the same Vercel/static-hosting pattern once it exists: build Flutter to `build/web`, deploy that directory, and point its GraphQL client at the backend `/graphql` URL.

## Run

Open `frontend/index.html` directly in a browser, or serve it from the project root:

```bash
python3 -m http.server 5173
```

Then visit:

```text
http://127.0.0.1:5173/frontend/
```

The frontend calls `http://127.0.0.1:8000/graphql` by default. To point it at another API,
edit `frontend/config.js` before deploying or override it in the browser:

```js
localStorage.setItem("rentals_api_base", "https://your-api.example.com")
```

If the backend is not running, the page shows curated sample listings so the design and browsing workflow remain usable.
