

-- type admin bugalter hamshira
CREATE TABLE IF NOT EXISTS admin                           (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    type INT CHECK (type IN (1, 2, 3)),
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS lavozim(
    id SERIAL PRIMARY KEY,
name VARCHAR(100) NOT NULL,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS xodim(
   id SERIAL PRIMARY KEY,
   name VARCHAR(100) NOT NULL,
   phone VARCHAR(50) NOT NULL,
   lavozim_id INT NOT NULL,
   address VARCHAR(100) NOT NULL,
   oylik INT NOT NULL,
   face_descriptor JSONB,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bonus(
  id SERIAL PRIMARY KEY,
  xodim_id INT NOT NULL,
  narx INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS jarima(
  id SERIAL PRIMARY KEY,
  xodim_id INT NOT NULL,
  narx INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS kunlik(
  id SERIAL PRIMARY KEY,
  xodim_id INT NOT NULL,
  narx INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS oylik_type (
  id SERIAL PRIMARY KEY,
  xodim_id INT NOT NULL,
  narx NUMERIC(12, 2) NOT NULL, -- 12 ta raqam, 2ta verguldan keyin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sklad_product(
    id SERIAL PRIMARY KEY,
    nomi VARCHAR(100) NOT NULL,  --kartoshka
    hajm NUMERIC(12, 2) NOT NULL,  --1
    hajm_birlik VARCHAR(50) NOT NULL, --kg
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sklad_product_taktic(
    id SERIAL PRIMARY KEY,
    hajm NUMERIC(12, 2) NOT NULL, --yangi qoshilayapgan maxsulot
    sklad_product_id integer NOT NULL, --qaysi productga tegishli
    narx integer NOT NULL,
    payment_method VARCHAR(20), -- naqt/karta/bank/boshqa, umumiySumma.jsx shu bo'yicha guruhlaydi
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chiqim_qoshimcha(
    id SERIAL PRIMARY KEY,
    price integer NOT NULL, --yangi qoshilayapgan maxsulot
    payment_method VARCHAR(20), -- naqt/karta/bank/boshqa, umumiySumma.jsx shu bo'yicha guruhlaydi
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chiqim_ombor (
    id SERIAL PRIMARY KEY,
    hajm NUMERIC(12, 2) NOT NULL, -- yangi qo‘shilayotgan mahsulot
    sklad_product_id INTEGER NOT NULL, -- qaysi productga tegishli
    description TEXT,
    chiqim_sana TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chiqim_maishiy(
    id SERIAL PRIMARY KEY,
    hajm integer NOT NULL, --yangi qoshilayapgan maxsulot
    sklad_product_id integer NOT NULL, --qaysi productga tegishli
    description TEXT,
    chiqim_sana TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sklad_maishiy(
    id SERIAL PRIMARY KEY,
    nomi VARCHAR(100) NOT NULL,  --kartoshka
    hajm integer NOT NULL,  --1
    hajm_birlik VARCHAR(50) NOT NULL, --kg
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS kirim_maishiy(
    id SERIAL PRIMARY KEY,
    hajm integer NOT NULL, --yangi qoshilayapgan maxsulot
    sklad_product_id integer NOT NULL, --qaysi productga tegishli
    narx integer NOT NULL,
    payment_method VARCHAR(20), -- naqt/karta/bank/boshqa, umumiySumma.jsx shu bo'yicha guruhlaydi
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS guruh(
 id SERIAL PRIMARY KEY,
 name VARCHAR(50),
xodim_id INT NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS darssana (
  id SERIAL PRIMARY KEY,
  mavzu VARCHAR(150) NOT NULL,
  sana DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bola_kuni_all (
  id SERIAL PRIMARY KEY,
  mavzu VARCHAR(150) NOT NULL,
  sana DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bola_kun (
  id SERIAL PRIMARY KEY,
  holati INTEGER NOT NULL DEFAULT 0,
  bola_id INTEGER NOT NULL,
  darssana_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (bola_id, darssana_id)
);
CREATE TABLE IF NOT EXISTS daromat_type (
  id SERIAL PRIMARY KEY,
  bola_id INT NOT NULL,
  sana DATE NOT NULL, -- oy va yil uchun (masalan 2024-06-01)
  naqt INT DEFAULT 0,
  karta INT DEFAULT 0,
  prichislena INT DEFAULT 0,
  naqt_prichislena INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bola(
 id SERIAL PRIMARY KEY,
 username VARCHAR(100) NOT NULL,
 metrka VARCHAR(50) UNIQUE NOT NULL,
 guruh_id INT NOT NULL,
 tugilgan_kun TIMESTAMP NOT NULL,
 oylik_toliv INT NOT NULL, 
 balans INT NOT NULL, 
 holati VARCHAR(100) NOT NULL,
 ota_FISH VARCHAR(100) NOT NULL,
 ota_phone VARCHAR(100),
 ota_pasport VARCHAR(50),
  ona_FISH VARCHAR(100) NOT NULL,
 ona_phone VARCHAR(100),
 ona_pasport VARCHAR(50),
 qoshimcha_phone VARCHAR(50),
 address VARCHAR(300),
 description TEXT,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS taom (
  id SERIAL PRIMARY KEY,
  nomi VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS taom_ingredient (
  id SERIAL PRIMARY KEY,
  taom_id INTEGER REFERENCES taom(id) ON DELETE CASCADE,
  sklad_product_id INTEGER REFERENCES sklad_product(id),
  miqdor NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Taomnoma ishlatish tarixi: qaysi kuni qaysi taom necha bolaga tayyorlangani
-- (routes/taom/ishlatish.js). Avval faqat qo'lda yaratilgan edi, shu bois
-- schema.sql'da yo'q edi.
CREATE TABLE IF NOT EXISTS taom_ishlatish (
  id SERIAL PRIMARY KEY,
  taom_id INTEGER NOT NULL REFERENCES taom(id) ON DELETE CASCADE,
  sana DATE NOT NULL,
  bolalar_soni INTEGER NOT NULL CHECK (bolalar_soni > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER SEQUENCE taom_ishlatish_id_seq OWNED BY taom_ishlatish.id;
GRANT USAGE, SELECT ON SEQUENCE taom_ishlatish_id_seq TO abbasuz3_user;

ALTER SEQUENCE taom_id_seq OWNED BY taom.id;
GRANT USAGE, SELECT ON SEQUENCE taom_id_seq TO abbasuz3_user;

ALTER SEQUENCE taom_ingredient_id_seq OWNED BY taom_ingredient.id;
GRANT USAGE, SELECT ON SEQUENCE taom_ingredient_id_seq TO abbasuz3_user;
ALTER SEQUENCE admin_id_seq OWNED BY admin.id;
GRANT USAGE, SELECT ON SEQUENCE admin_id_seq TO abbasuz3_user;

ALTER SEQUENCE lavozim_id_seq OWNED BY lavozim.id;
GRANT USAGE, SELECT ON SEQUENCE lavozim_id_seq TO abbasuz3_user;

ALTER SEQUENCE xodim_id_seq OWNED BY xodim.id;
GRANT USAGE, SELECT ON SEQUENCE xodim_id_seq TO abbasuz3_user;

ALTER SEQUENCE bonus_id_seq OWNED BY bonus.id;
GRANT USAGE, SELECT ON SEQUENCE bonus_id_seq TO abbasuz3_user;


ALTER SEQUENCE jarima_id_seq OWNED BY jarima.id;
GRANT USAGE, SELECT ON SEQUENCE jarima_id_seq TO abbasuz3_user;

ALTER SEQUENCE kunlik_id_seq OWNED BY kunlik.id;
GRANT USAGE, SELECT ON SEQUENCE kunlik_id_seq TO abbasuz3_user;

ALTER SEQUENCE oylik_type_id_seq OWNED BY oylik_type.id;
GRANT USAGE, SELECT ON SEQUENCE oylik_type_id_seq TO abbasuz3_user;

ALTER SEQUENCE sklad_product_id_seq OWNED BY sklad_product.id;
GRANT USAGE, SELECT ON SEQUENCE sklad_product_id_seq TO abbasuz3_user;

ALTER SEQUENCE sklad_product_taktic_id_seq OWNED BY sklad_product_taktic.id;
GRANT USAGE, SELECT ON SEQUENCE sklad_product_taktic_id_seq TO abbasuz3_user;

ALTER SEQUENCE guruh_id_seq OWNED BY guruh.id;
GRANT USAGE, SELECT ON SEQUENCE guruh_id_seq TO abbasuz3_user;

ALTER SEQUENCE bola_id_seq OWNED BY bola.id;
GRANT USAGE, SELECT ON SEQUENCE bola_id_seq TO abbasuz3_user;



ALTER SEQUENCE chiqim_qoshimcha_id_seq OWNED BY chiqim_qoshimcha.id;
GRANT USAGE, SELECT ON SEQUENCE chiqim_qoshimcha_id_seq TO abbasuz3_user;

ALTER SEQUENCE chiqim_ombor_id_seq OWNED BY chiqim_ombor.id;
GRANT USAGE, SELECT ON SEQUENCE chiqim_ombor_id_seq TO abbasuz3_user;

ALTER SEQUENCE chiqim_maishiy_id_seq OWNED BY chiqim_maishiy.id;
GRANT USAGE, SELECT ON SEQUENCE chiqim_maishiy_id_seq TO abbasuz3_user;

ALTER SEQUENCE sklad_maishiy_id_seq OWNED BY sklad_maishiy.id;
GRANT USAGE, SELECT ON SEQUENCE sklad_maishiy_id_seq TO abbasuz3_user;

ALTER SEQUENCE kirim_maishiy_id_seq OWNED BY kirim_maishiy.id;
GRANT USAGE, SELECT ON SEQUENCE kirim_maishiy_id_seq TO abbasuz3_user;





ALTER SEQUENCE darssana_id_seq OWNED BY darssana.id;
GRANT USAGE, SELECT ON SEQUENCE darssana_id_seq TO abbasuz3_user;

ALTER SEQUENCE bola_kun_id_seq OWNED BY bola_kun.id;
GRANT USAGE, SELECT ON SEQUENCE bola_kun_id_seq TO abbasuz3_user;

ALTER SEQUENCE daromat_type_id_seq OWNED BY daromat_type.id;
GRANT USAGE, SELECT ON SEQUENCE daromat_type_id_seq TO abbasuz3_user;
ALTER SEQUENCE bola_kuni_all_id_seq OWNED BY bola_kuni_all.id;
GRANT USAGE, SELECT ON SEQUENCE bola_kuni_all_id_seq TO abbasuz3_user;

-- Per-admin permission flags (view_/create_/edit_/delete_<module> booleans),
-- stored as one JSONB blob per admin since the key set is frontend-defined.
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL UNIQUE REFERENCES admin(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER SEQUENCE permissions_id_seq OWNED BY permissions.id;
GRANT USAGE, SELECT ON SEQUENCE permissions_id_seq TO abbasuz3_user;

-- Audit log: one row per admin action (create/update/delete) across the app,
-- read by the "Tarix" admin page (filters by admin/method/table/date client-side).
CREATE TABLE IF NOT EXISTS tarix (
  id SERIAL PRIMARY KEY,
  admin_username VARCHAR(100),
  method VARCHAR(10) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  izoh TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER SEQUENCE tarix_id_seq OWNED BY tarix.id;
GRANT USAGE, SELECT ON SEQUENCE tarix_id_seq TO abbasuz3_user;

-- Trial/candidate children ("sinov bola"), tracked separately from `bola`
-- until they're accepted; mirrors bola's columns (see routes/bolaPrpRoutes.js).
CREATE TABLE IF NOT EXISTS bola_prp (
 id SERIAL PRIMARY KEY,
 username VARCHAR(100) NOT NULL,
 metrka VARCHAR(50) NOT NULL,
 guruh_id INT NOT NULL,
 tugilgan_kun TIMESTAMP NOT NULL,
 oylik_toliv INT NOT NULL,
 balans INT NOT NULL DEFAULT 0,
 holati VARCHAR(100) NOT NULL DEFAULT 'boshlangich',
 ota_FISH VARCHAR(100) NOT NULL,
 ota_phone VARCHAR(100),
 ota_pasport VARCHAR(50),
 ona_FISH VARCHAR(100) NOT NULL,
 ona_phone VARCHAR(100),
 ona_pasport VARCHAR(50),
 qoshimcha_phone VARCHAR(50),
 address VARCHAR(300),
 description TEXT,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER SEQUENCE bola_prp_id_seq OWNED BY bola_prp.id;
GRANT USAGE, SELECT ON SEQUENCE bola_prp_id_seq TO abbasuz3_user;

-- Attendance for trial children, same shape as bola_kun but against bola_prp.
CREATE TABLE IF NOT EXISTS bola_kun_prp (
  id SERIAL PRIMARY KEY,
  holati INTEGER NOT NULL DEFAULT 0,
  bola_id INTEGER NOT NULL,
  darssana_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER SEQUENCE bola_kun_prp_id_seq OWNED BY bola_kun_prp.id;
GRANT USAGE, SELECT ON SEQUENCE bola_kun_prp_id_seq TO abbasuz3_user;

-- Manual bonus/shtraf adjustments per child (positive = shtraf, negative = bonus).
CREATE TABLE IF NOT EXISTS bola_pay_control (
  id SERIAL PRIMARY KEY,
  bola_id INTEGER NOT NULL,
  miqdor NUMERIC NOT NULL,
  sana DATE NOT NULL,
  izoh TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER SEQUENCE bola_pay_control_id_seq OWNED BY bola_pay_control.id;
GRANT USAGE, SELECT ON SEQUENCE bola_pay_control_id_seq TO abbasuz3_user;

-- Monthly payments recorded per child.
CREATE TABLE IF NOT EXISTS bola_pay_new (
  id SERIAL PRIMARY KEY,
  bola_id INTEGER NOT NULL,
  miqdor NUMERIC NOT NULL,
  sana DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER SEQUENCE bola_pay_new_id_seq OWNED BY bola_pay_new.id;
GRANT USAGE, SELECT ON SEQUENCE bola_pay_new_id_seq TO abbasuz3_user;

-- Employee attendance system: work schedule type, planned hours, photo.
ALTER TABLE xodim
  ADD COLUMN IF NOT EXISTS ish_tur INT NOT NULL DEFAULT 1, -- 1=davomat bilan (fixed schedule), 2=erkin ish (custom workdays)
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS image VARCHAR(255);

-- Custom scheduled workdays for ish_tur=2 employees (routes/xodimRoutes.js :id/workday).
CREATE TABLE IF NOT EXISTS xodim_workdays (
  id SERIAL PRIMARY KEY,
  xodim_id INTEGER NOT NULL REFERENCES xodim(id) ON DELETE CASCADE,
  work_day DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (xodim_id, work_day)
);
ALTER SEQUENCE xodim_workdays_id_seq OWNED BY xodim_workdays.id;
GRANT USAGE, SELECT ON SEQUENCE xodim_workdays_id_seq TO abbasuz3_user;

-- Daily clock-in/clock-out record per employee.
CREATE TABLE IF NOT EXISTS xodim_one_day (
  id SERIAL PRIMARY KEY,
  xodim_id INTEGER NOT NULL REFERENCES xodim(id) ON DELETE CASCADE,
  xodim_workdays_id INTEGER,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER SEQUENCE xodim_one_day_id_seq OWNED BY xodim_one_day.id;
GRANT USAGE, SELECT ON SEQUENCE xodim_one_day_id_seq TO abbasuz3_user;

-- Which guruh(s) a tarbiyachi-type admin is assigned to (pages/tarbiyachi/davomat.js).
CREATE TABLE IF NOT EXISTS group_admin (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES guruh(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (admin_id, group_id)
);
ALTER SEQUENCE group_admin_id_seq OWNED BY group_admin.id;
GRANT USAGE, SELECT ON SEQUENCE group_admin_id_seq TO abbasuz3_user;

-- Global toggle: how employee check-in/out is captured on /xodimdavomat
-- ('button' = manual Ishga keldim/Ishdan ketdim buttons, 'face' = face-id kiosk).
-- Superadmin-only setting, single row.
CREATE TABLE IF NOT EXISTS davomat_settings (
  id SERIAL PRIMARY KEY,
  mode VARCHAR(10) NOT NULL DEFAULT 'button' CHECK (mode IN ('button', 'face')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO davomat_settings (mode)
  SELECT 'button' WHERE NOT EXISTS (SELECT 1 FROM davomat_settings);

-- Indexes on columns actually used in WHERE filters, so lookups stay fast as
-- data grows instead of degrading into sequential scans.
CREATE INDEX IF NOT EXISTS idx_bola_pay_new_bola_id ON bola_pay_new(bola_id);
CREATE INDEX IF NOT EXISTS idx_bola_pay_control_bola_id ON bola_pay_control(bola_id);
CREATE INDEX IF NOT EXISTS idx_chiqim_maishiy_sklad_product_id ON chiqim_maishiy(sklad_product_id);
CREATE INDEX IF NOT EXISTS idx_chiqim_maishiy_chiqim_sana ON chiqim_maishiy(chiqim_sana);
CREATE INDEX IF NOT EXISTS idx_kirim_maishiy_sklad_product_id ON kirim_maishiy(sklad_product_id);
CREATE INDEX IF NOT EXISTS idx_chiqim_ombor_sklad_product_id ON chiqim_ombor(sklad_product_id);
CREATE INDEX IF NOT EXISTS idx_chiqim_ombor_chiqim_sana ON chiqim_ombor(chiqim_sana);
CREATE INDEX IF NOT EXISTS idx_sklad_product_taktic_sklad_product_id ON sklad_product_taktic(sklad_product_id);
CREATE INDEX IF NOT EXISTS idx_daromat_type_bola_id ON daromat_type(bola_id);
CREATE INDEX IF NOT EXISTS idx_taom_ingredient_taom_id ON taom_ingredient(taom_id);
CREATE INDEX IF NOT EXISTS idx_taom_ingredient_sklad_product_id ON taom_ingredient(sklad_product_id);
CREATE INDEX IF NOT EXISTS idx_xodim_one_day_xodim_id_created_at ON xodim_one_day(xodim_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bola_prp_is_active ON bola_prp(is_active);
CREATE INDEX IF NOT EXISTS idx_bola_is_active ON bola(is_active);
CREATE INDEX IF NOT EXISTS idx_bola_kun_created_at ON bola_kun(created_at);
CREATE INDEX IF NOT EXISTS idx_bola_kun_bola_id ON bola_kun(bola_id);
-- --------------------------------------------------------------------------
-- Qo'shimcha indekslar: JOIN qilinadigan tashqi kalitlar va sana bo'yicha
-- filtrlanadigan ustunlar. PostgreSQL tashqi kalitga avtomatik indeks
-- yaratmaydi — indekssiz har JOIN butun jadvalni o'qiydi.
-- --------------------------------------------------------------------------

-- Tashqi kalitlar
CREATE INDEX IF NOT EXISTS idx_xodim_lavozim_id ON xodim(lavozim_id);
CREATE INDEX IF NOT EXISTS idx_bonus_xodim_id ON bonus(xodim_id);
CREATE INDEX IF NOT EXISTS idx_jarima_xodim_id ON jarima(xodim_id);
CREATE INDEX IF NOT EXISTS idx_kunlik_xodim_id ON kunlik(xodim_id);
CREATE INDEX IF NOT EXISTS idx_oylik_type_xodim_id ON oylik_type(xodim_id);
CREATE INDEX IF NOT EXISTS idx_guruh_xodim_id ON guruh(xodim_id);
CREATE INDEX IF NOT EXISTS idx_bola_guruh_id ON bola(guruh_id);
CREATE INDEX IF NOT EXISTS idx_bola_prp_guruh_id ON bola_prp(guruh_id);
CREATE INDEX IF NOT EXISTS idx_bola_kun_darssana_id ON bola_kun(darssana_id);
CREATE INDEX IF NOT EXISTS idx_bola_kun_prp_bola_id ON bola_kun_prp(bola_id);
CREATE INDEX IF NOT EXISTS idx_bola_kun_prp_darssana_id ON bola_kun_prp(darssana_id);
CREATE INDEX IF NOT EXISTS idx_taom_ishlatish_taom_id ON taom_ishlatish(taom_id);
CREATE INDEX IF NOT EXISTS idx_xodim_one_day_workdays_id ON xodim_one_day(xodim_workdays_id);
CREATE INDEX IF NOT EXISTS idx_group_admin_group_id ON group_admin(group_id);

-- Sana ustunlari (oy bo'yicha filtrlash va ORDER BY uchun)
CREATE INDEX IF NOT EXISTS idx_darssana_sana ON darssana(sana);
CREATE INDEX IF NOT EXISTS idx_bola_kuni_all_sana ON bola_kuni_all(sana);
CREATE INDEX IF NOT EXISTS idx_daromat_type_sana ON daromat_type(sana);
CREATE INDEX IF NOT EXISTS idx_taom_ishlatish_sana ON taom_ishlatish(sana);
CREATE INDEX IF NOT EXISTS idx_bola_pay_control_sana ON bola_pay_control(sana);
CREATE INDEX IF NOT EXISTS idx_bola_pay_new_sana ON bola_pay_new(sana);
