'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const { installImportRoutes } = require('./import-routes-safe');
const { installEditRoutes } = require('./edit-routes');
const { installCatalogRoutes } = require('./catalog-import-routes');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ocean@123';

if (!DATABASE_URL) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.set('trust proxy', 1);

async function schema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users(
      id BIGSERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contacts(
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      district TEXT,
      postal_code TEXT,
      address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products(
      id BIGSERIAL PRIMARY KEY,
      item_code TEXT UNIQUE NOT NULL,
      item_name TEXT NOT NULL,
      barcode TEXT,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS letter_templates(
      id BIGSERIAL PRIMARY KEY,
      template_no TEXT UNIQUE NOT NULL,
      title TEXT,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders(
      id BIGSERIAL PRIMARY KEY,
      order_no TEXT UNIQUE NOT NULL,
      contact_id BIGINT REFERENCES contacts(id),
      recipient_name TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      district TEXT,
      postal_code TEXT,
      address TEXT,
      letter_template_no TEXT,
      status TEXT NOT NULL DEFAULT 'NEW',
      waybill_done BOOLEAN DEFAULT FALSE,
      waybill_no TEXT,
      dhl_tracking_no TEXT,
      order_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items(
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
      item_code TEXT NOT NULL,
      item_name TEXT NOT NULL,
      qty NUMERIC(12,3) NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS activity_logs(
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const existing = await pool.query(
    'SELECT id FROM users WHERE username=$1',
    [ADMIN_USER],
  );

  if (!existing.rowCount) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await pool.query(
      'INSERT INTO users(username,password_hash) VALUES($1,$2)',
      [ADMIN_USER, hash],
    );
  }
}

function token(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' },
  );
}

function auth(req, res, next) {
  try {
    const raw = req.cookies.ocean_token;
    if (!raw) return res.status(401).json({ error: 'Oturum gerekli' });
    req.user = jwt.verify(raw, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Oturum süresi doldu' });
  }
}

async function log(orderId, action, details = {}) {
  try {
    await pool.query(
      'INSERT INTO activity_logs(order_id,action,details) VALUES($1,$2,$3::jsonb)',
      [orderId, action, JSON.stringify(details)],
    );
  } catch {
    // Logging must not block the business operation.
  }
}

async function nextNo() {
  const year = new Date().getFullYear();
  const q = await pool.query(
    'SELECT order_no FROM orders WHERE order_no LIKE $1 ORDER BY id DESC LIMIT 1',
    [`INF-${year}-%`],
  );

  let number = 1;
  if (q.rowCount) {
    const match = q.rows[0].order_no.match(/(\d+)$/);
    if (match) number = Number(match[1]) + 1;
  }

  return `INF-${year}-${String(number).padStart(6, '0')}`;
}

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const q = await pool.query('SELECT * FROM users WHERE username=$1', [username]);

  if (!q.rowCount || !(await bcrypt.compare(password || '', q.rows[0].password_hash))) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
  }

  res.cookie('ocean_token', token(q.rows[0]), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
  });

  res.json({
    ok: true,
    user: { username: q.rows[0].username, role: q.rows[0].role },
  });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('ocean_token');
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/contacts', auth, async (req, res) => {
  const q = await pool.query('SELECT * FROM contacts ORDER BY name');
  res.json(q.rows);
});

app.post('/api/contacts', auth, async (req, res) => {
  const x = req.body || {};
  const q = await pool.query(
    'INSERT INTO contacts(name,phone,city,district,postal_code,address) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
    [x.name, x.phone || '', x.city || '', x.district || '', x.postal_code || '', x.address || ''],
  );
  res.json(q.rows[0]);
});

app.get('/api/products', auth, async (req, res) => {
  const q = await pool.query(
    'SELECT * FROM products WHERE active=true ORDER BY item_name',
  );
  res.json(q.rows);
});

app.post('/api/products', auth, async (req, res) => {
  const x = req.body || {};
  const q = await pool.query(
    `INSERT INTO products(item_code,item_name,barcode)
     VALUES($1,$2,$3)
     ON CONFLICT(item_code)
     DO UPDATE SET
       item_name=EXCLUDED.item_name,
       barcode=EXCLUDED.barcode,
       updated_at=NOW()
     RETURNING *`,
    [x.item_code, x.item_name, x.barcode || ''],
  );
  res.json(q.rows[0]);
});

app.get('/api/templates', auth, async (req, res) => {
  const q = await pool.query('SELECT * FROM letter_templates ORDER BY template_no');
  res.json(q.rows);
});

app.post('/api/templates', auth, async (req, res) => {
  const x = req.body || {};
  const q = await pool.query(
    `INSERT INTO letter_templates(template_no,title,body)
     VALUES($1,$2,$3)
     ON CONFLICT(template_no)
     DO UPDATE SET
       title=EXCLUDED.title,
       body=EXCLUDED.body,
       updated_at=NOW()
     RETURNING *`,
    [x.template_no, x.title || '', x.body || ''],
  );
  res.json(q.rows[0]);
});

app.get('/api/orders', auth, async (req, res) => {
  const params = [];
  const where = [];
  let i = 1;

  if (req.query.q) {
    where.push(`(o.order_no ILIKE $${i} OR o.recipient_name ILIKE $${i} OR o.city ILIKE $${i})`);
    params.push(`%${req.query.q}%`);
    i++;
  }

  if (req.query.status && req.query.status !== 'all') {
    where.push(`o.status=$${i++}`);
    params.push(req.query.status);
  }

  if (req.query.date) {
    where.push(`o.order_date=$${i++}`);
    params.push(req.query.date);
  }

  if (req.query.from) {
    where.push(`o.order_date>=$${i++}`);
    params.push(req.query.from);
  }

  if (req.query.to) {
    where.push(`o.order_date<=$${i++}`);
    params.push(req.query.to);
  }

  const sql = `
    SELECT
      o.*,
      COALESCE(
        json_agg(
          json_build_object(
            'item_code',oi.item_code,
            'item_name',oi.item_name,
            'qty',oi.qty
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id=o.id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    GROUP BY o.id
    ORDER BY o.created_at DESC,o.id DESC
  `;

  const q = await pool.query(sql, params);
  res.json(q.rows);
});

app.get('/api/orders/days', auth, async (req, res) => {
  const q = await pool.query(
    'SELECT order_date,COUNT(*)::int count FROM orders GROUP BY order_date ORDER BY order_date DESC LIMIT 60',
  );
  res.json(q.rows);
});

app.post('/api/orders', auth, async (req, res) => {
  const x = req.body || {};
  const no = await nextNo();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const q = await client.query(
      `INSERT INTO orders(
        order_no,contact_id,recipient_name,phone,city,district,
        postal_code,address,letter_template_no,status,order_date
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'NEW',COALESCE($10,CURRENT_DATE))
      RETURNING *`,
      [
        no,
        x.contact_id || null,
        x.recipient_name,
        x.phone || '',
        x.city || '',
        x.district || '',
        x.postal_code || '',
        x.address || '',
        x.letter_template_no || '',
        x.order_date || null,
      ],
    );

    for (const item of x.items || []) {
      await client.query(
        'INSERT INTO order_items(order_id,item_code,item_name,qty) VALUES($1,$2,$3,$4)',
        [q.rows[0].id, item.item_code, item.item_name, Number(item.qty || 1)],
      );
    }

    await client.query('COMMIT');
    await log(q.rows[0].id, 'ORDER_CREATED', { user: req.user.username });
    res.json(q.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.patch('/api/orders/:id', auth, async (req, res) => {
  const x = req.body || {};
  const q = await pool.query(
    `UPDATE orders
     SET
       status=COALESCE($1,status),
       waybill_done=COALESCE($2,waybill_done),
       waybill_no=COALESCE($3,waybill_no),
       dhl_tracking_no=COALESCE($4,dhl_tracking_no),
       updated_at=NOW()
     WHERE id=$5
     RETURNING *`,
    [
      x.status ?? null,
      x.waybill_done ?? null,
      x.waybill_no ?? null,
      x.dhl_tracking_no ?? null,
      req.params.id,
    ],
  );

  if (!q.rowCount) {
    return res.status(404).json({ error: 'Sipariş bulunamadı' });
  }

  await log(req.params.id, 'ORDER_UPDATED', x);
  res.json(q.rows[0]);
});

app.get('/api/orders/:id/activity', auth, async (req, res) => {
  const q = await pool.query(
    'SELECT * FROM activity_logs WHERE order_id=$1 ORDER BY created_at DESC',
    [req.params.id],
  );
  res.json(q.rows);
});

app.post('/api/orders/:id/dhl/create', auth, async (req, res) => {
  res.status(501).json({
    error: 'DHL eCommerce API bilgileri bekleniyor',
    code: 'DHL_NOT_CONFIGURED',
  });
});

installImportRoutes(app, pool, auth);
installEditRoutes(app, pool, auth);
installCatalogRoutes(app, pool, auth);

const publicDir = path.join(__dirname, 'public');

function sendApp(res) {
  const file = path.join(publicDir, 'index.html');
  const scripts = [
    '/ux-overhaul.js?v=4',
    '/archive-enhancements.js?v=1',
    '/premium-shell.js?v=2',
    '/reports-premium.js?v=3',
  ];

  const tags = scripts.map(src => `<script src="${src}"></script>`).join('');
  const html = fs.readFileSync(file, 'utf8').replace('</body>', `${tags}</body>`);

  res.type('html').send(html);
}

app.get('/', (req, res) => sendApp(res));
app.use(express.static(publicDir));
app.get('*', (req, res) => sendApp(res));

schema()
  .then(() => app.listen(PORT, () => console.log(`Ocean Influencer running on ${PORT}`)))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });