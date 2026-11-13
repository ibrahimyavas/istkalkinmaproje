// Ortam değişkenlerini diğer modüllerden ÖNCE yükler (ESM import'ları gövdeden önce
// çalıştığı için dotenv.config'in app.js gövdesinde olması yetmiyordu).
// Vercel'de .env dosyası yoktur; değişkenler proje ayarlarından gelir.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '..', '.env') });
