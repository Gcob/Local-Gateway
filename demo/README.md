# Demo Projects

Two minimal Nginx demos to explore Local Gateway hands-on.
Both require the gateway to be running (`just up`).

---

## nginx-ready

Labels are already applied — just start it.

```bash
just demo-ready
```

Open [http://nginx-ready.localhost](http://nginx-ready.localhost) in your browser.

To stop:

```bash
just demo-stop
```

---

## nginx-blank

A bare Nginx container with no routing configuration. Use `lgw add` to wire it up yourself.

1. Navigate to the demo folder:

   ```bash
   cd demo/nginx-blank
   ```

2. Connect it to the gateway:

   ```bash
   lgw add
   ```

   When prompted: service → `web`, domain → `nginx-blank.localhost`, port → `80`

3. Start the container:

   ```bash
   docker compose up -d
   ```

4. Open [http://nginx-blank.localhost](http://nginx-blank.localhost) in your browser.

To see all active routes:

```bash
lgw list
```

To stop:

```bash
docker compose down
```
