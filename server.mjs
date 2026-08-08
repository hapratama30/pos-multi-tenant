import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const isServiceKeyValid = process.env.SUPABASE_SERVICE_ROLE_KEY && 
                           process.env.SUPABASE_SERVICE_ROLE_KEY.length > 50 &&
                           !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('Pakai');

const supabaseKey = isServiceKeyValid 
  ? process.env.SUPABASE_SERVICE_ROLE_KEY 
  : (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

console.log(`Backend Supabase initialized with url: ${supabaseUrl} and key type: ${isServiceKeyValid ? 'SERVICE_ROLE' : 'ANON'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const xenditAuthHeader = {
  Authorization: 'Basic ' + Buffer.from((process.env.XENDIT_SECRET_KEY || '') + ':').toString('base64'),
  'Content-Type': 'application/json',
};

const XENDIT_KEY = process.env.XENDIT_SECRET_KEY;

// Duitku Config
const DUITKU_MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || '';
const DUITKU_API_KEY = process.env.DUITKU_API_KEY || '';
const DUITKU_IS_SANDBOX = process.env.DUITKU_IS_SANDBOX !== 'false';

// Tripay Config
const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE || '';
const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY || '';
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY || '';
const TRIPAY_IS_SANDBOX = process.env.TRIPAY_IS_SANDBOX !== 'false';

// iPaymu Config
const IPAYMU_VA = process.env.IPAYMU_VA || '';
const IPAYMU_API_KEY = process.env.IPAYMU_API_KEY || '';
const IPAYMU_IS_SANDBOX = process.env.IPAYMU_IS_SANDBOX !== 'false';

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}


app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'agrapos-backend' });
});

// ==========================================
// PLATFORM SETTINGS (GLOBAL FEATURE TOGGLES)
// ==========================================

app.get('/api/saas/platform-settings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('platform_settings').select('feature_flags').eq('id', 1).maybeSingle();
    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet, return defaults
        return res.json({ success: true, features: { deposit_qris_enabled: true, deposit_transfer_enabled: true, pos_split_payment_enabled: true } });
      }
      throw error;
    }
    return res.json({ success: true, features: data?.feature_flags || { deposit_qris_enabled: true, deposit_transfer_enabled: true, pos_split_payment_enabled: true } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/saas/platform-settings', async (req, res) => {
  const { pin, features } = req.body;
  const SUPERADMIN_PIN = process.env.VITE_SUPERADMIN_PIN || '@Hapratama30';
  if (pin !== SUPERADMIN_PIN) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { error } = await supabase.from('platform_settings')
      .upsert({ id: 1, feature_flags: features, updated_at: new Date().toISOString() });
    
    if (error) throw error;
    return res.json({ success: true, message: 'Platform settings updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/saas/update-tenant-payment', async (req, res) => {
  const { pin, tenantId, merchantId, qrisStatus, vaStatus } = req.body;
  const SUPERADMIN_PIN = process.env.VITE_SUPERADMIN_PIN || '@Hapratama30';
  if (pin !== SUPERADMIN_PIN) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: existing } = await supabase
      .from('payment_settings')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('payment_settings')
        .update({
          xendit_merchant_id: merchantId === '' ? null : merchantId,
          xendit_qris_status: qrisStatus,
          xendit_va_status: vaStatus,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);
      if (error) throw error;
    } else {
      const { data: mainOutlet } = await supabase
        .from('outlets')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_main', true)
        .maybeSingle();

      const { error } = await supabase
        .from('payment_settings')
        .insert({
          tenant_id: tenantId,
          outlet_id: mainOutlet?.id || null,
          xendit_merchant_id: merchantId === '' ? null : merchantId,
          xendit_qris_status: qrisStatus,
          xendit_va_status: vaStatus,
          payment_cash_enabled: true,
          payment_qris_enabled: false,
          payment_va_enabled: false
        });
      if (error) throw error;
    }

    return res.json({ success: true, message: 'Payment settings updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/xendit/register-tenant', async (req, res) => {
  const { tenantId, outletId, businessName, emailBisnis } = req.body;

  if (!tenantId || !businessName || !emailBisnis) {
    return res.status(400).json({ error: 'Data input tidak lengkap!' });
  }

  if (!process.env.XENDIT_SECRET_KEY) {
    return res.status(503).json({ error: 'XENDIT_SECRET_KEY belum dikonfigurasi di server.' });
  }

  try {
    const xenditResponse = await axios.post(
      'https://api.xendit.co/v2/accounts',
      {
        type: 'MANAGED',
        email: emailBisnis,
        business_profile: { business_name: businessName },
      },
      { headers: xenditAuthHeader }
    );

    const xenditData = xenditResponse.data;
    const xenditAccountId = xenditData.id;
    const activationUrl = xenditData.public_profile?.activation_url || '';
    const storedMerchantId = activationUrl ? `${xenditAccountId}|${activationUrl}` : xenditAccountId;

    // OTOMATISASI: Set webhook URL untuk Sub-account baru secara programatik agar otomatis menerima callback
    const hostUrl = process.env.VITE_API_URL || 'https://agrapos.vercel.app';
    const cleanHostUrl = hostUrl.replace('localhost:5173', 'localhost:5000'); // fallback port server lokal jika diperlukan
    const finalWebhookUrl = `${cleanHostUrl.replace(/\/$/, '')}/api/xendit/webhook-payment`;

    console.log(`[Auto-Webhook] Mendaftarkan URL callback otomatis ke sub-account: ${finalWebhookUrl}`);

    // 1. Set callback QR Code Paid
    try {
      await axios.post(
        'https://api.xendit.co/callback_urls/qr_code',
        { url: finalWebhookUrl },
        { headers: { ...xenditAuthHeader, 'for-user-id': xenditAccountId } }
      );
      console.log(`[Auto-Webhook] Sukses set qr_code callback untuk sub-account ${xenditAccountId}`);
    } catch (cbErr) {
      console.warn(`[Auto-Webhook Warning] Gagal set qr_code callback untuk ${xenditAccountId}:`, cbErr.response?.data || cbErr.message);
    }

    // 2. Set callback VA Paid
    try {
      await axios.post(
        'https://api.xendit.co/callback_urls/fva_paid',
        { url: finalWebhookUrl },
        { headers: { ...xenditAuthHeader, 'for-user-id': xenditAccountId } }
      );
      console.log(`[Auto-Webhook] Sukses set fva_paid callback untuk sub-account ${xenditAccountId}`);
    } catch (cbErr) {
      console.warn(`[Auto-Webhook Warning] Gagal set fva_paid callback untuk ${xenditAccountId}:`, cbErr.response?.data || cbErr.message);
    }

    const { error: supabaseError } = await supabase
      .from('payment_settings')
      .upsert(
        {
          tenant_id: tenantId,
          outlet_id: outletId,
          xendit_merchant_id: storedMerchantId,
          xendit_va_status: 'Diproses',
          xendit_qris_status: 'Diproses',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id, outlet_id' }
      );

    if (supabaseError) throw supabaseError;

    return res.status(200).json({
      success: true,
      message: 'Sub-akun berhasil dibuat di Xendit!',
      xenditAccountId,
      activationUrl,
    });
  } catch (error) {
    console.error('Error Register Tenant:', error.response?.data || error.message);
    
    // Check if the sub-account already exists on Xendit anyway
    try {
      console.log('Checking if sub-account already exists in Xendit...');
      const accountsResponse = await axios.get(
        'https://api.xendit.co/v2/accounts',
        { headers: xenditAuthHeader }
      );
      
      const existingAccount = (accountsResponse.data?.data || []).find(
        acc => acc.email?.toLowerCase() === emailBisnis.toLowerCase()
      );
      
      if (existingAccount) {
        const xenditAccountId = existingAccount.id;
        const activationUrl = existingAccount.public_profile?.activation_url || '';
        const isSandbox = (process.env.XENDIT_SECRET_KEY || '').includes('development') || (process.env.XENDIT_SECRET_KEY || '').includes('test');
        const isApproved = existingAccount.status === 'LIVE' || (isSandbox && existingAccount.status === 'REGISTERED');
        const status = isApproved ? 'Aktif' : 'Diproses';
        const storedMerchantId = activationUrl ? `${xenditAccountId}|${activationUrl}` : xenditAccountId;

        const { error: supabaseError } = await supabase
          .from('payment_settings')
          .upsert(
            {
              tenant_id: tenantId,
              outlet_id: outletId,
              xendit_merchant_id: storedMerchantId,
              xendit_va_status: status,
              xendit_qris_status: status,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id, outlet_id' }
          );

        if (supabaseError) throw supabaseError;

        console.log(`Auto-linked existing Xendit sub-account: ${xenditAccountId}`);
        return res.status(200).json({
          success: true,
          message: 'Sub-akun sudah terdaftar di Xendit dan berhasil dihubungkan otomatis!',
          xenditAccountId,
          activationUrl,
        });
      }
    } catch (lookupError) {
      console.error('Error looking up existing accounts:', lookupError.message);
    }

    return res.status(500).json({
      error: error.response?.data?.message || error.message || 'Gagal mendaftarkan akun ke Xendit.',
    });
  }
});

app.get('/api/xendit/account/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Account ID required' });
  if (id === 'MASTER') {
    return res.status(200).json({
      success: true,
      status: 'Aktif',
      activationUrl: '',
      account: { id: 'MASTER', status: 'LIVE' }
    });
  }
  try {
    const cleanId = id.split('|')[0];
    const response = await axios.get(
      `https://api.xendit.co/v2/accounts/${cleanId}`,
      { headers: xenditAuthHeader }
    );
    const accData = response.data;
    const activationUrl = accData.public_profile?.activation_url || '';
    
    const isSandbox = (process.env.XENDIT_SECRET_KEY || '').includes('development') || (process.env.XENDIT_SECRET_KEY || '').includes('test');
    const isApproved = accData.status === 'LIVE' || (isSandbox && accData.status === 'REGISTERED');
    const status = isApproved ? 'Aktif' : 'Diproses';

    if (isApproved) {
      const storedMerchantId = activationUrl ? `${cleanId}|${activationUrl}` : cleanId;
      await supabase
        .from('payment_settings')
        .update({
          xendit_va_status: 'Aktif',
          xendit_qris_status: 'Aktif',
          payment_qris_enabled: true,
          payment_va_enabled: true,
          xendit_merchant_id: storedMerchantId,
          updated_at: new Date().toISOString()
        })
        .like('xendit_merchant_id', `${cleanId}%`);
    } else {
      const storedMerchantId = activationUrl ? `${cleanId}|${activationUrl}` : cleanId;
      await supabase
        .from('payment_settings')
        .update({
          xendit_merchant_id: storedMerchantId,
          updated_at: new Date().toISOString()
        })
        .like('xendit_merchant_id', `${cleanId}%`);
    }

    return res.status(200).json({
      success: true,
      status,
      activationUrl,
      account: accData
    });
  } catch (error) {
    console.error('Error fetching Xendit sub-account:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.message || error.message || 'Gagal mengambil data akun Xendit.'
    });
  }
});

app.post('/api/xendit/webhook-account-update', async (req, res) => {
  const webhookData = req.body;
  const callbackToken = req.headers['x-callback-token'];

  // Verifikasi Callback Token jika dikonfigurasi di env
  const expectedToken = process.env.XENDIT_CALLBACK_TOKEN;
  if (expectedToken && callbackToken !== expectedToken) {
    console.warn(`[Webhook Account Update] Callback token tidak cocok. Dikirim: ${callbackToken}`);
    return res.status(401).send('Unauthorized callback token');
  }

  if (webhookData.status === 'LIVE') {
    const xenditAccountId = webhookData.id;

    try {
      const { error } = await supabase
        .from('payment_settings')
        .update({
          xendit_va_status: 'Aktif',
          xendit_qris_status: 'Aktif',
          payment_qris_enabled: true,
          payment_va_enabled: true,
        })
        .like('xendit_merchant_id', `${xenditAccountId}%`);

      if (error) throw error;
      console.log(`[Webhook] Akun Xendit ${xenditAccountId} AKTIF.`);
    } catch (err) {
      console.error('[Webhook Error]', err.message);
    }
  }

  res.status(200).send('OK');
});

app.post('/api/xendit/create-qr', async (req, res) => {
  const { tenantId, outletId, amount, transactionId } = req.body;

  if (!tenantId || !amount || !transactionId) {
    return res.status(400).json({ error: 'Data input tidak lengkap!' });
  }

  try {
    let query = supabase
      .from('payment_settings')
      .select('xendit_merchant_id')
      .eq('tenant_id', tenantId)
      .not('xendit_merchant_id', 'is', null);

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data: settingsList, error: dbError } = await query
      .order('updated_at', { ascending: false })
      .limit(1);

    if (dbError) throw dbError;
    const settings = settingsList?.[0];
    
    const rawId = settings?.xendit_merchant_id || '';

    // Direct iPaymu Routing
    if (rawId.startsWith('IPAYMU|')) {
      const parts = rawId.split('|');
      const tenantVa = parts[1] || '';
      const tenantApiKey = parts[2] || '';
      const cleanHostUrl = (req.headers['x-forwarded-proto'] || req.protocol) + '://' + req.get('host');

      // Ambil Platform Global Settings untuk cek Split Payment
      let splitEnabled = false;
      let commPercent = 0;
      let commFlat = 0;

      try {
        const { data: globalSettings } = await supabase
          .from('platform_settings')
          .select('feature_flags')
          .eq('id', 1)
          .maybeSingle();
        if (globalSettings?.feature_flags) {
          splitEnabled = globalSettings.feature_flags.pos_split_payment_enabled !== false;
          commPercent = Number(globalSettings.feature_flags.pos_commission_percent || 0);
          commFlat = Number(globalSettings.feature_flags.pos_commission_flat || 0);
        }
      } catch (e) {
        console.error('Error fetching platform settings for split:', e.message);
      }

      // Tentukan apakah kita menggunakan Split Payment (melalui Master iPaymu)
      const useSplit = splitEnabled && IPAYMU_VA && IPAYMU_API_KEY && tenantVa;

      const activeVa = useSplit ? IPAYMU_VA : tenantVa;
      const activeApiKey = useSplit ? IPAYMU_API_KEY : tenantApiKey;

      if (!activeApiKey) {
        throw new Error('API Key iPaymu tidak dikonfigurasi!');
      }

      const totalAmount = Number(amount);
      const ipaymuPayload = {
        name: 'AgraPOS Customer',
        email: 'customer@agrapos.dev',
        phone: '081234567890',
        amount: String(totalAmount),
        notifyUrl: `${cleanHostUrl}/api/ipaymu/callback`,
        paymentMethod: 'qris',
        paymentChannel: 'qris',
        referenceId: `TX-${transactionId}`,
        product: ['Transaksi POS'],
        qty: ['1'],
        price: [String(totalAmount)],
        description: ['Pembayaran POS AgraPOS']
      };

      // Terapkan bagi hasil (Split) ke VA Tenant jika mode split aktif
      if (useSplit) {
        const commission = Math.round((totalAmount * (commPercent / 100)) + commFlat);
        const tenantAmount = Math.max(0, totalAmount - commission);

        if (tenantAmount > 0) {
          ipaymuPayload.split_va = [tenantVa];
          if (commFlat > 0 || commPercent > 0) {
            ipaymuPayload.split_amount = [String(tenantAmount)];
          } else {
            ipaymuPayload.split_percent = [String(100 - commPercent)];
          }
        }
      }

      const bodyJson = JSON.stringify(ipaymuPayload);
      const bodyHash = crypto.createHash('sha256').update(bodyJson).digest('hex');
      const stringToSign = `POST:${activeVa}:${bodyHash}:${activeApiKey}`;
      const signature = crypto.createHmac('sha256', activeApiKey).update(stringToSign).digest('hex');

      const nowTime = new Date();
      const timestamp = nowTime.getFullYear() +
        String(nowTime.getMonth() + 1).padStart(2, '0') +
        String(nowTime.getDate()).padStart(2, '0') +
        String(nowTime.getHours()).padStart(2, '0') +
        String(nowTime.getMinutes()).padStart(2, '0') +
        String(nowTime.getSeconds()).padStart(2, '0');

      const isSandbox = activeApiKey.toUpperCase().includes('SANDBOX');
      const response = await axios.post(
        isSandbox
          ? 'https://sandbox.ipaymu.com/api/v2/payment/direct'
          : 'https://my.ipaymu.com/api/v2/payment/direct',
        ipaymuPayload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'va': activeVa,
            'signature': signature,
            'timestamp': timestamp
          }
        }
      );

      if (!response.data || response.data.Status !== 200) {
        throw new Error(`iPaymu QRIS Failed: ${response.data?.Message || 'Unknown error'}`);
      }

      return res.status(200).json({
        success: true,
        qrString: response.data.Data.QrString || response.data.Data.Url || '',
        qrCodeId: String(response.data.Data.TransactionId),
        status: 'ACTIVE'
      });
    }
    
    const xenditMerchantId = rawId.split('|')[0];
    
    if (!xenditMerchantId || xenditMerchantId === 'ID-AGRAPOS-BYPASS') {
      return res.status(200).json({
        success: true,
        isSimulated: true,
        qrString: `https://agrapos.dev/qris-simulate?amount=${amount}&merchant=ID-AGRAPOS-BYPASS&tx=${transactionId}`,
      });
    }

    const headers = {
      ...xenditAuthHeader,
      'api-version': '2022-07-31'
    };
    if (xenditMerchantId && xenditMerchantId !== 'MASTER') {
      headers['for-user-id'] = xenditMerchantId;
    }

    const response = await axios.post(
      'https://api.xendit.co/qr_codes',
      {
        reference_id: String(transactionId),
        type: 'DYNAMIC',
        currency: 'IDR',
        amount: Number(amount)
      },
      { headers }
    );

    return res.status(200).json({
      success: true,
      qrString: response.data.qr_string,
      qrCodeId: response.data.id,
      status: response.data.status,
    });
  } catch (error) {
    console.error('Error Create QR:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.message || error.message || 'Gagal generate QRIS.',
    });
  }
});

app.post('/api/xendit/create-va', async (req, res) => {
  const { tenantId, outletId, bankCode, name, amount, transactionId } = req.body;

  if (!tenantId || !bankCode || !name || !amount || !transactionId) {
    return res.status(400).json({ error: 'Data input tidak lengkap!' });
  }

  try {
    let query = supabase
      .from('payment_settings')
      .select('xendit_merchant_id')
      .eq('tenant_id', tenantId)
      .not('xendit_merchant_id', 'is', null);

    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }

    const { data: settingsList, error: dbError } = await query
      .order('updated_at', { ascending: false })
      .limit(1);

    if (dbError) throw dbError;
    const settings = settingsList?.[0];

    const rawId = settings?.xendit_merchant_id || '';

    // Direct iPaymu VA Routing
    if (rawId.startsWith('IPAYMU|')) {
      const parts = rawId.split('|');
      const tenantVa = parts[1] || '';
      const tenantApiKey = parts[2] || '';
      const cleanHostUrl = (req.headers['x-forwarded-proto'] || req.protocol) + '://' + req.get('host');
      const ipaymuChannel = bankCode.toLowerCase(); // e.g. bca, mandiri, bni, bri

      // Ambil Platform Global Settings untuk cek Split Payment
      let splitEnabled = false;
      let commPercent = 0;
      let commFlat = 0;

      try {
        const { data: globalSettings } = await supabase
          .from('platform_settings')
          .select('feature_flags')
          .eq('id', 1)
          .maybeSingle();
        if (globalSettings?.feature_flags) {
          splitEnabled = globalSettings.feature_flags.pos_split_payment_enabled !== false;
          commPercent = Number(globalSettings.feature_flags.pos_commission_percent || 0);
          commFlat = Number(globalSettings.feature_flags.pos_commission_flat || 0);
        }
      } catch (e) {
        console.error('Error fetching platform settings for split (VA):', e.message);
      }

      // Tentukan apakah kita menggunakan Split Payment (melalui Master iPaymu)
      const useSplit = splitEnabled && IPAYMU_VA && IPAYMU_API_KEY && tenantVa;

      const activeVa = useSplit ? IPAYMU_VA : tenantVa;
      const activeApiKey = useSplit ? IPAYMU_API_KEY : tenantApiKey;

      if (!activeApiKey) {
        throw new Error('API Key iPaymu tidak dikonfigurasi!');
      }

      const totalAmount = Number(amount);
      const ipaymuPayload = {
        name: name || 'AgraPOS Customer',
        email: 'customer@agrapos.dev',
        phone: '081234567890',
        amount: String(totalAmount),
        notifyUrl: `${cleanHostUrl}/api/ipaymu/callback`,
        paymentMethod: 'va',
        paymentChannel: ipaymuChannel,
        referenceId: `TX-${transactionId}`,
        product: ['Transaksi POS'],
        qty: ['1'],
        price: [String(totalAmount)],
        description: ['Pembayaran VA POS AgraPOS']
      };

      // Terapkan bagi hasil (Split) ke VA Tenant jika mode split aktif
      if (useSplit) {
        const commission = Math.round((totalAmount * (commPercent / 100)) + commFlat);
        const tenantAmount = Math.max(0, totalAmount - commission);

        if (tenantAmount > 0) {
          ipaymuPayload.split_va = [tenantVa];
          if (commFlat > 0 || commPercent > 0) {
            ipaymuPayload.split_amount = [String(tenantAmount)];
          } else {
            ipaymuPayload.split_percent = [String(100 - commPercent)];
          }
        }
      }

      const bodyJson = JSON.stringify(ipaymuPayload);
      const bodyHash = crypto.createHash('sha256').update(bodyJson).digest('hex');
      const stringToSign = `POST:${activeVa}:${bodyHash}:${activeApiKey}`;
      const signature = crypto.createHmac('sha256', activeApiKey).update(stringToSign).digest('hex');

      const nowTime = new Date();
      const timestamp = nowTime.getFullYear() +
        String(nowTime.getMonth() + 1).padStart(2, '0') +
        String(nowTime.getDate()).padStart(2, '0') +
        String(nowTime.getHours()).padStart(2, '0') +
        String(nowTime.getMinutes()).padStart(2, '0') +
        String(nowTime.getSeconds()).padStart(2, '0');

      const isSandbox = activeApiKey.toUpperCase().includes('SANDBOX');
      const response = await axios.post(
        isSandbox
          ? 'https://sandbox.ipaymu.com/api/v2/payment/direct'
          : 'https://my.ipaymu.com/api/v2/payment/direct',
        ipaymuPayload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'va': activeVa,
            'signature': signature,
            'timestamp': timestamp
          }
        }
      );

      if (!response.data || response.data.Status !== 200) {
        throw new Error(`iPaymu VA Failed: ${response.data?.Message || 'Unknown error'}`);
      }

      return res.status(200).json({
        success: true,
        accountNumber: response.data.Data.PaymentNo,
        bankCode: bankCode.toUpperCase(),
        name: name,
        externalId: String(response.data.Data.TransactionId)
      });
    }

    const xenditMerchantId = rawId.split('|')[0];

    if (!xenditMerchantId || xenditMerchantId === 'ID-AGRAPOS-BYPASS') {
      const suffix = String(tenantId).replace(/\D/g, '').substring(0, 7) || '1234567';
      const fakeVaCodes = { BCA: '883011', MANDIRI: '894022', BNI: '8810', BRI: '26215' };
      const prefix = fakeVaCodes[bankCode.toUpperCase()] || '8888';
      return res.status(200).json({
        success: true,
        isSimulated: true,
        accountNumber: `${prefix}${amount}${suffix}`.substring(0, 16),
        bankCode,
        name
      });
    }

    const headers = { ...xenditAuthHeader };
    if (xenditMerchantId && xenditMerchantId !== 'MASTER') {
      headers['for-user-id'] = xenditMerchantId;
    }

    const response = await axios.post(
      'https://api.xendit.co/callback_virtual_accounts',
      {
        external_id: String(transactionId),
        bank_code: bankCode.toUpperCase(),
        name: name,
        expected_amount: Number(amount),
        is_closed: true
      },
      { headers }
    );

    return res.status(200).json({
      success: true,
      accountNumber: response.data.account_number,
      bankCode: response.data.bank_code,
      name: response.data.name,
      expectedAmount: response.data.expected_amount,
      status: response.data.status,
    });
  } catch (error) {
    console.error('Error Create VA:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.message || error.message || 'Gagal generate VA.',
    });
  }
});

app.post('/api/xendit/simulate-va-payment', async (req, res) => {
  const { externalId, amount, subaccountId } = req.body;
  if (!externalId || !amount) {
    return res.status(400).json({ error: 'Missing externalId or amount' });
  }

  try {
    const headers = { ...xenditAuthHeader };
    if (subaccountId) {
      headers['for-user-id'] = subaccountId;
    }
    console.log(`[Simulate VA] externalId: ${externalId}, amount: ${amount}, subaccountId: ${subaccountId}`);
    const response = await axios.post(
      `https://api.xendit.co/callback_virtual_accounts/external_id=${externalId}/simulate_payment`,
      { amount: Number(amount) },
      { headers }
    );
    return res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error simulating VA payment on server:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

app.get('/api/xendit/check-full-key', (req, res) => {
  const key = process.env.XENDIT_SECRET_KEY || '';
  return res.json({
    suffix: key.substring(key.length - 15),
    length: key.length
  });
});

app.post('/api/xendit/create-subscription-payment', async (req, res) => {
  const { method, bankCode, amount, name, email } = req.body;

  if (!method || !amount) {
    return res.status(400).json({ error: 'Data input tidak lengkap!' });
  }

  try {
    const referenceId = `sub-payment-${Date.now()}`;

    if (method === 'QRIS') {
      const headers = {
        ...xenditAuthHeader,
        'api-version': '2022-07-31'
      };
      
      const response = await axios.post(
        'https://api.xendit.co/qr_codes',
        {
          reference_id: referenceId,
          type: 'DYNAMIC',
          currency: 'IDR',
          amount: Number(amount)
        },
        { headers }
      );

      return res.status(200).json({
        success: true,
        qrString: response.data.qr_string,
        paymentId: response.data.id,
        referenceId
      });
    } else if (method === 'VA') {
      const headers = { ...xenditAuthHeader };
      
      const response = await axios.post(
        'https://api.xendit.co/callback_virtual_accounts',
        {
          external_id: referenceId,
          bank_code: bankCode.toUpperCase(),
          name: name || 'AGRAPos Subscriber',
          expected_amount: Number(amount),
          is_closed: true
        },
        { headers }
      );

      return res.status(200).json({
        success: true,
        accountNumber: response.data.account_number,
        bankCode: response.data.bank_code,
        paymentId: response.data.id,
        referenceId
      });
    }

    return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
  } catch (error) {
    console.error('Error Create Subscription Payment Xendit:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.message || error.message || 'Gagal generate pembayaran dari Xendit.',
    });
  }
});

app.post('/api/saas/register-paid-subscription', async (req, res) => {
  const { email, password, namaOwner, namaToko, nomorHp, planId } = req.body;

  if (!email || !password || !namaOwner || !namaToko || !nomorHp || !planId) {
    return res.status(400).json({ error: 'Data input tidak lengkap!' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered in staff
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id, tenant_id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingStaff) {
      // Cek status tenant-nya
      const { data: tenant } = await supabase
        .from('tenants')
        .select('status, tenant_id')
        .eq('tenant_id', existingStaff.tenant_id)
        .maybeSingle();

      if (tenant && tenant.status === 'pending_payment') {
        // Verifikasi password untuk keamanan menggunakan Supabase Auth API
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (signInError) {
          return res.status(400).json({ error: 'Email ini sudah terdaftar dalam proses pembayaran pending. Silakan masukkan password yang benar untuk melanjutkan pembayaran.' });
        }

        // Cari billing pending yang sudah ada
        let { data: billing } = await supabase
          .from('tenant_billing')
          .select('*')
          .eq('tenant_id', tenant.tenant_id)
          .eq('status', 'pending')
          .maybeSingle();

        // Jika billing tidak ditemukan (misal terhapus), buat baru
        if (!billing) {
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('price_monthly')
            .eq('id', planId)
            .maybeSingle();

          const planPrice = planData?.price_monthly || 99000;

          const { data: newBilling, error: newBillingErr } = await supabase
            .from('tenant_billing')
            .insert({
              tenant_id: tenant.tenant_id,
              plan_id: planId,
              amount: planPrice,
              status: 'pending'
            })
            .select()
            .single();

          if (newBillingErr) {
            return res.status(500).json({ error: 'Gagal membuat invoice baru.' });
          }
          billing = newBilling;
        }

        // Sekarang generate Xendit Payment baru (karena user mungkin ganti metode pembayaran atau bank)
        const referenceId = `BILL-${billing.id}`;
        const planPrice = billing.amount;

        if (method === 'QRIS') {
          const headers = {
            ...xenditAuthHeader,
            'api-version': '2022-07-31'
          };
          
          const response = await axios.post(
            'https://api.xendit.co/qr_codes',
            {
              reference_id: referenceId,
              type: 'DYNAMIC',
              currency: 'IDR',
              amount: Number(planPrice)
            },
            { headers }
          );

          // Simpan Xendit QR ID ke DB
          await supabase.from('tenant_billing').update({
            xendit_invoice_id: response.data.id,
            payment_method: 'QRIS'
          }).eq('id', billing.id);

          return res.status(200).json({
            success: true,
            billingId: billing.id,
            paymentData: {
              qrString: response.data.qr_string,
              paymentId: response.data.id,
              referenceId
            }
          });
        } else if (method === 'VA') {
          const headers = { ...xenditAuthHeader };
          
          const response = await axios.post(
            'https://api.xendit.co/callback_virtual_accounts',
            {
              external_id: referenceId,
              bank_code: bankCode.toUpperCase(),
              name: namaOwner || 'AGRAPos Subscriber',
              expected_amount: Number(planPrice),
              is_closed: true
            },
            { headers }
          );

          // Simpan Xendit VA ID ke DB
          await supabase.from('tenant_billing').update({
            xendit_invoice_id: response.data.id,
            payment_method: 'VA'
          }).eq('id', billing.id);

          return res.status(200).json({
            success: true,
            billingId: billing.id,
            paymentData: {
              accountNumber: response.data.account_number,
              bankCode: response.data.bank_code,
              paymentId: response.data.id,
              referenceId
            }
          });
        }
      }

      return res.status(400).json({ error: 'Email ini sudah terdaftar aktif di sistem. Silakan login.' });
    }

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: { name: namaOwner.trim(), role: 'Owner' }
    });

    if (authError) {
      console.error('Auth User Creation Error:', authError.message);
      return res.status(400).json({ error: authError.message || 'Gagal mendaftarkan user.' });
    }

    const uid = authData.user.id;

    // 2. Create Tenant ID
    const tenantId = 'T' + crypto.randomBytes(6).toString('hex').toUpperCase();

    // 3. Insert Tenant
    const { error: tError } = await supabase.from('tenants').insert({
      tenant_id: tenantId,
      tenant_name: namaToko.trim(),
      phone: nomorHp.trim(),
      status: 'active',
      plan_id: planId
    });

    if (tError) {
      console.error('Tenant DB Insert Error:', tError.message);
      // Clean up auth user
      await supabase.auth.admin.deleteUser(uid);
      return res.status(500).json({ error: 'Gagal membuat profil tenant.' });
    }

    // 4. Insert Staff/Owner
    const { error: sError } = await supabase.from('staff').insert({
      tenant_id: tenantId,
      auth_user_id: uid,
      name: namaOwner.trim(),
      email: cleanEmail,
      phone: nomorHp.trim(),
      role: 'Owner',
      status: 'Aktif'
    });

    if (sError) {
      console.error('Staff DB Insert Error:', sError.message);
      // Clean up
      await supabase.from('tenants').delete().eq('tenant_id', tenantId);
      await supabase.auth.admin.deleteUser(uid);
      return res.status(500).json({ error: 'Gagal membuat profil owner.' });
    }

    // 5. Update Subscription to planId
    await supabase.from('tenant_subscriptions').upsert({
      tenant_id: tenantId,
      plan_id: planId,
      status: 'active'
    });



    return res.status(200).json({
      success: true,
      message: 'Registrasi dan pembayaran berhasil diverifikasi!',
      tenantId,
      uid
    });
  } catch (error) {
    console.error('Subscription signup error:', error.message);
    if (error.response?.data) {
      console.error('Subscription signup error data:', error.response.data);
    }
    return res.status(500).json({ error: error.message || 'Terjadi kesalahan sistem saat mendaftarkan langganan.' });
  }
});

app.post('/api/saas/register-pending-subscription', async (req, res) => {
  const { email, password, namaOwner, namaToko, nomorHp, planId, method, bankCode } = req.body;

  if (!email || !password || !namaOwner || !namaToko || !nomorHp || !planId || !method) {
    return res.status(400).json({ error: 'Data input tidak lengkap!' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered in staff
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id, tenant_id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingStaff) {
      // Cek status tenant-nya
      const { data: tenant } = await supabase
        .from('tenants')
        .select('status, tenant_id')
        .eq('tenant_id', existingStaff.tenant_id)
        .maybeSingle();

      if (tenant && tenant.status === 'pending_payment') {
        // Verifikasi password untuk keamanan menggunakan Supabase Auth API
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (signInError) {
          return res.status(400).json({ error: 'Email ini sudah terdaftar dalam proses pembayaran pending. Silakan masukkan password yang benar untuk melanjutkan pembayaran.' });
        }

        // Cari billing pending yang sudah ada
        let { data: billing } = await supabase
          .from('tenant_billing')
          .select('*')
          .eq('tenant_id', tenant.tenant_id)
          .eq('status', 'pending')
          .maybeSingle();

        // Jika billing tidak ditemukan (misal terhapus), buat baru
        if (!billing) {
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('price_monthly')
            .eq('id', planId)
            .maybeSingle();

          const planPrice = planData?.price_monthly || 99000;

          const { data: newBilling, error: newBillingErr } = await supabase
            .from('tenant_billing')
            .insert({
              tenant_id: tenant.tenant_id,
              plan_id: planId,
              amount: planPrice,
              status: 'pending'
            })
            .select()
            .single();

          if (newBillingErr) {
            return res.status(500).json({ error: 'Gagal membuat invoice baru.' });
          }
          billing = newBilling;
        }

        // Sekarang generate Duitku / Xendit Payment baru
        const referenceId = `BILL-${billing.id}`;
        const planPrice = billing.amount;
        const cleanHostUrl = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;

        if (IPAYMU_VA && IPAYMU_API_KEY) {
          const paymentAmount = Number(planPrice);
          
          let paymentMethodCode = '';
          let paymentChannelCode = '';
          if (method === 'QRIS') {
            paymentMethodCode = 'qris';
            paymentChannelCode = 'qris';
          } else if (method === 'VA') {
            paymentMethodCode = 'va';
            paymentChannelCode = bankCode.toLowerCase();
          }

          const notifyUrl = `${cleanHostUrl.replace(/\/$/, '')}/api/ipaymu/callback`;
          const returnUrl = `${cleanHostUrl.replace(/\/$/, '')}/dashboard`;
          const cancelUrl = `${cleanHostUrl.replace(/\/$/, '')}/`;

          const ipaymuPayload = {
            name: namaOwner || 'AGRAPos User',
            phone: nomorHp || '081234567890',
            email: email || 'user@agrapos.id',
            amount: paymentAmount,
            notifyUrl: notifyUrl,
            returnUrl: returnUrl,
            cancelUrl: cancelUrl,
            referenceId: referenceId,
            paymentMethod: paymentMethodCode,
            paymentChannel: paymentChannelCode,
            product: [`Langganan Paket ${planId.toUpperCase()}`],
            qty: ["1"],
            price: [String(paymentAmount)],
            description: [`Langganan AGRAPos - ${planId.toUpperCase()}`]
          };

          const bodyJson = JSON.stringify(ipaymuPayload);
          const bodyHash = crypto.createHash('sha256').update(bodyJson).digest('hex');
          const stringToSign = `POST:${IPAYMU_VA}:${bodyHash}:${IPAYMU_API_KEY}`;
          const signature = crypto.createHmac('sha256', IPAYMU_API_KEY).update(stringToSign).digest('hex');

          const now = new Date();
          const timestamp = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');

          const response = await axios.post(
            IPAYMU_IS_SANDBOX 
              ? 'https://sandbox.ipaymu.com/api/v2/payment/direct'
              : 'https://my.ipaymu.com/api/v2/payment/direct',
            ipaymuPayload,
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'va': IPAYMU_VA,
                'signature': signature,
                'timestamp': timestamp
              }
            }
          );

          if (!response.data || response.data.Status !== 200) {
            return res.status(500).json({ error: `iPaymu Inquiry Gagal: ${response.data?.Message || 'Unknown error'}` });
          }

          const ipaymuData = response.data.Data;

          await supabase.from('tenant_billing').update({
            xendit_invoice_id: String(ipaymuData.TransactionId),
            payment_method: method
          }).eq('id', billing.id);

          if (method === 'QRIS') {
            return res.status(200).json({
              success: true,
              billingId: billing.id,
              paymentData: {
                qrString: ipaymuData.QrString || ipaymuData.Url || '',
                paymentId: String(ipaymuData.TransactionId),
                referenceId
              }
            });
          } else {
            return res.status(200).json({
              success: true,
              billingId: billing.id,
              paymentData: {
                accountNumber: ipaymuData.PaymentNo || '',
                bankCode: bankCode.toUpperCase(),
                paymentId: String(ipaymuData.TransactionId),
                referenceId
              }
            });
          }
        }

        if (TRIPAY_API_KEY && TRIPAY_MERCHANT_CODE && TRIPAY_PRIVATE_KEY) {
          const paymentAmount = Number(planPrice);
          const signature = crypto
            .createHmac('sha256', TRIPAY_PRIVATE_KEY)
            .update(TRIPAY_MERCHANT_CODE + referenceId + paymentAmount)
            .digest('hex');

          let paymentMethodCode = '';
          if (method === 'QRIS') {
            paymentMethodCode = 'QRIS';
          } else if (method === 'VA') {
            const bankMap = { 'BCA': 'BCAVA', 'MANDIRI': 'MANDIRIVA', 'BRI': 'BRIVA', 'BNI': 'BNIVA' };
            paymentMethodCode = bankMap[bankCode.toUpperCase()] || 'BRIVA';
          }

          const callbackUrl = `${cleanHostUrl.replace(/\/$/, '')}/api/tripay/callback`;

          const tripayPayload = {
            method: paymentMethodCode,
            merchant_ref: referenceId,
            amount: paymentAmount,
            customer_name: namaOwner,
            customer_email: email,
            customer_phone: nomorHp,
            order_items: [
              {
                sku: planId,
                name: `Langganan AGRAPos - ${planId.toUpperCase()}`,
                price: paymentAmount,
                quantity: 1
              }
            ],
            callback_url: callbackUrl,
            expired_time: Math.floor(Date.now() / 1000) + 24 * 3600
          };

          const response = await axios.post(
            TRIPAY_IS_SANDBOX
              ? 'https://tripay.co.id/api-sandbox/transaction/create'
              : 'https://tripay.co.id/api/transaction/create',
            tripayPayload,
            {
              headers: {
                Authorization: `Bearer ${TRIPAY_API_KEY}`
              }
            }
          );

          if (!response.data || !response.data.success) {
            return res.status(500).json({ error: `Tripay Inquiry Gagal: ${response.data.message || 'Unknown error'}` });
          }

          const tripayData = response.data.data;

          await supabase.from('tenant_billing').update({
            xendit_invoice_id: tripayData.reference,
            payment_method: method
          }).eq('id', billing.id);

          if (method === 'QRIS') {
            return res.status(200).json({
              success: true,
              billingId: billing.id,
              paymentData: {
                qrString: tripayData.qr_string || tripayData.qr_url || '',
                paymentId: tripayData.reference,
                referenceId
              }
            });
          } else {
            return res.status(200).json({
              success: true,
              billingId: billing.id,
              paymentData: {
                accountNumber: tripayData.pay_code || '',
                bankCode: bankCode.toUpperCase(),
                paymentId: tripayData.reference,
                referenceId
              }
            });
          }
        }

        if (DUITKU_MERCHANT_CODE && DUITKU_API_KEY) {
          const paymentAmount = Number(planPrice);
          const signature = md5(DUITKU_MERCHANT_CODE + referenceId + paymentAmount + DUITKU_API_KEY);
          
          let paymentMethodCode = '';
          if (method === 'QRIS') {
            paymentMethodCode = 'DQ';
          } else if (method === 'VA') {
            const bankMap = { 'BCA': 'BC', 'MANDIRI': 'M2', 'BRI': 'BR', 'BNI': 'B1' };
            paymentMethodCode = bankMap[bankCode.toUpperCase()] || 'VC';
          }

          const callbackUrl = `${cleanHostUrl.replace(/\/$/, '')}/api/duitku/callback`;
          const returnUrl = `${cleanHostUrl.replace(/\/$/, '')}/dashboard`;

          const response = await axios.post(
            DUITKU_IS_SANDBOX 
              ? 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'
              : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry',
            {
              merchantCode: DUITKU_MERCHANT_CODE,
              paymentAmount: paymentAmount,
              paymentMethod: paymentMethodCode,
              merchantOrderId: referenceId,
              productDetails: `Langganan AGRAPos - ${planId.toUpperCase()}`,
              email: email,
              phoneNumber: nomorHp,
              signature: signature,
              callbackUrl: callbackUrl,
              returnUrl: returnUrl,
              expiryPeriod: 1440
            }
          );

          if (response.data.statusCode !== '00') {
            return res.status(500).json({ error: `Duitku Inquiry Gagal: ${response.data.statusMessage || 'Unknown error'}` });
          }

          await supabase.from('tenant_billing').update({
            xendit_invoice_id: response.data.reference,
            payment_method: method
          }).eq('id', billing.id);

          if (method === 'QRIS') {
            return res.status(200).json({
              success: true,
              billingId: billing.id,
              paymentData: {
                qrString: response.data.qrContent || response.data.qrCode || response.data.paymentUrl || '',
                paymentId: response.data.reference,
                referenceId
              }
            });
          } else {
            return res.status(200).json({
              success: true,
              billingId: billing.id,
              paymentData: {
                accountNumber: response.data.vaNumber || '',
                bankCode: bankCode.toUpperCase(),
                paymentId: response.data.reference,
                referenceId
              }
            });
          }
        }

        if (method === 'QRIS') {
          const headers = {
            ...xenditAuthHeader,
            'api-version': '2022-07-31'
          };
          
          const response = await axios.post(
            'https://api.xendit.co/qr_codes',
            {
              reference_id: referenceId,
              type: 'DYNAMIC',
              currency: 'IDR',
              amount: Number(planPrice)
            },
            { headers }
          );

          // Simpan Xendit QR ID ke DB
          await supabase.from('tenant_billing').update({
            xendit_invoice_id: response.data.id,
            payment_method: 'QRIS'
          }).eq('id', billing.id);

          return res.status(200).json({
            success: true,
            billingId: billing.id,
            paymentData: {
              qrString: response.data.qr_string,
              paymentId: response.data.id,
              referenceId
            }
          });
        } else if (method === 'VA') {
          const headers = { ...xenditAuthHeader };
          
          const response = await axios.post(
            'https://api.xendit.co/callback_virtual_accounts',
            {
              external_id: referenceId,
              bank_code: bankCode.toUpperCase(),
              name: namaOwner || 'AGRAPos Subscriber',
              expected_amount: Number(planPrice),
              is_closed: true
            },
            { headers }
          );

          // Simpan Xendit VA ID ke DB
          await supabase.from('tenant_billing').update({
            xendit_invoice_id: response.data.id,
            payment_method: 'VA'
          }).eq('id', billing.id);

          return res.status(200).json({
            success: true,
            billingId: billing.id,
            paymentData: {
              accountNumber: response.data.account_number,
              bankCode: response.data.bank_code,
              paymentId: response.data.id,
              referenceId
            }
          });
        }
      }

      return res.status(400).json({ error: 'Email ini sudah terdaftar aktif di sistem. Silakan login.' });
    }

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: { name: namaOwner.trim(), role: 'Owner' }
    });

    if (authError) {
      console.error('Auth User Creation Error:', authError.message);
      return res.status(400).json({ error: authError.message || 'Gagal mendaftarkan user.' });
    }

    const uid = authData.user.id;

    // 2. Create Tenant ID
    const tenantId = 'T' + crypto.randomBytes(6).toString('hex').toUpperCase();

    // 3. Insert Tenant (status: pending_payment, plan_id: free)
    const { error: tError } = await supabase.from('tenants').insert({
      tenant_id: tenantId,
      tenant_name: namaToko.trim(),
      phone: nomorHp.trim(),
      status: 'pending_payment',
      plan_id: 'free'
    });

    if (tError) {
      console.error('Tenant DB Insert Error:', tError.message);
      await supabase.auth.admin.deleteUser(uid);
      return res.status(500).json({ error: 'Gagal membuat profil tenant.' });
    }

    // 4. Insert Staff/Owner
    const { error: sError } = await supabase.from('staff').insert({
      tenant_id: tenantId,
      auth_user_id: uid,
      name: namaOwner.trim(),
      email: cleanEmail,
      phone: nomorHp.trim(),
      role: 'Owner',
      status: 'Aktif'
    });

    if (sError) {
      console.error('Staff DB Insert Error:', sError.message);
      await supabase.from('tenants').delete().eq('tenant_id', tenantId);
      await supabase.auth.admin.deleteUser(uid);
      return res.status(500).json({ error: 'Gagal membuat profil owner.' });
    }

    // 5. Update Subscription to free first
    await supabase.from('tenant_subscriptions').upsert({
      tenant_id: tenantId,
      plan_id: 'free',
      status: 'active'
    });



    // 6. Fetch Plan price
    const { data: planData } = await supabase
      .from('subscription_plans')
      .select('price_monthly')
      .eq('id', planId)
      .maybeSingle();

    const planPrice = planData?.price_monthly || 99000; // fallback default price if missing

    // 7. Create billing invoice
    const { data: billing, error: billingErr } = await supabase
      .from('tenant_billing')
      .insert({
        tenant_id: tenantId,
        plan_id: planId,
        amount: planPrice,
        status: 'pending'
      })
      .select()
      .single();

    if (billingErr) {
      console.error('Billing creation error:', billingErr.message);
      // We don't need to delete user here because they got registered in free plan
    }

    // 8. Generate Payment (Duitku / Xendit)
    const referenceId = `BILL-${billing.id}`;
    const cleanHostUrl = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;

    if (IPAYMU_VA && IPAYMU_API_KEY) {
      const paymentAmount = Number(planPrice);
      
      let paymentMethodCode = '';
      let paymentChannelCode = '';
      if (method === 'QRIS') {
        paymentMethodCode = 'qris';
        paymentChannelCode = 'qris';
      } else if (method === 'VA') {
        paymentMethodCode = 'va';
        paymentChannelCode = bankCode.toLowerCase();
      }

      const notifyUrl = `${cleanHostUrl.replace(/\/$/, '')}/api/ipaymu/callback`;
      const returnUrl = `${cleanHostUrl.replace(/\/$/, '')}/dashboard`;
      const cancelUrl = `${cleanHostUrl.replace(/\/$/, '')}/`;

      const ipaymuPayload = {
        name: namaOwner || 'AGRAPos User',
        phone: nomorHp || '081234567890',
        email: email || 'user@agrapos.id',
        amount: paymentAmount,
        notifyUrl: notifyUrl,
        returnUrl: returnUrl,
        cancelUrl: cancelUrl,
        referenceId: referenceId,
        paymentMethod: paymentMethodCode,
        paymentChannel: paymentChannelCode,
        product: [`Langganan Paket ${planId.toUpperCase()}`],
        qty: ["1"],
        price: [String(paymentAmount)],
        description: [`Langganan AGRAPos - ${planId.toUpperCase()}`]
      };

      const bodyJson = JSON.stringify(ipaymuPayload);
      const bodyHash = crypto.createHash('sha256').update(bodyJson).digest('hex');
      const stringToSign = `POST:${IPAYMU_VA}:${bodyHash}:${IPAYMU_API_KEY}`;
      const signature = crypto.createHmac('sha256', IPAYMU_API_KEY).update(stringToSign).digest('hex');

      const now = new Date();
      const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');

      const response = await axios.post(
        IPAYMU_IS_SANDBOX 
          ? 'https://sandbox.ipaymu.com/api/v2/payment/direct'
          : 'https://my.ipaymu.com/api/v2/payment/direct',
        ipaymuPayload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'va': IPAYMU_VA,
            'signature': signature,
            'timestamp': timestamp
          }
        }
      );

      if (!response.data || response.data.Status !== 200) {
        return res.status(500).json({ error: `iPaymu Inquiry Gagal: ${response.data?.Message || 'Unknown error'}` });
      }

      const ipaymuData = response.data.Data;

      await supabase.from('tenant_billing').update({
        xendit_invoice_id: String(ipaymuData.TransactionId),
        payment_method: method
      }).eq('id', billing.id);

      if (method === 'QRIS') {
        return res.status(200).json({
          success: true,
          billingId: billing.id,
          paymentData: {
            qrString: ipaymuData.QrString || ipaymuData.Url || '',
            paymentId: String(ipaymuData.TransactionId),
            referenceId
          }
        });
      } else {
        return res.status(200).json({
          success: true,
          billingId: billing.id,
          paymentData: {
            accountNumber: ipaymuData.PaymentNo || '',
            bankCode: bankCode.toUpperCase(),
            paymentId: String(ipaymuData.TransactionId),
            referenceId
          }
        });
      }
    }

    if (TRIPAY_API_KEY && TRIPAY_MERCHANT_CODE && TRIPAY_PRIVATE_KEY) {
      const paymentAmount = Number(planPrice);
      const signature = crypto
        .createHmac('sha256', TRIPAY_PRIVATE_KEY)
        .update(TRIPAY_MERCHANT_CODE + referenceId + paymentAmount)
        .digest('hex');

      let paymentMethodCode = '';
      if (method === 'QRIS') {
        paymentMethodCode = 'QRIS';
      } else if (method === 'VA') {
        const bankMap = { 'BCA': 'BCAVA', 'MANDIRI': 'MANDIRIVA', 'BRI': 'BRIVA', 'BNI': 'BNIVA' };
        paymentMethodCode = bankMap[bankCode.toUpperCase()] || 'BRIVA';
      }

      const callbackUrl = `${cleanHostUrl.replace(/\/$/, '')}/api/tripay/callback`;

      const tripayPayload = {
        method: paymentMethodCode,
        merchant_ref: referenceId,
        amount: paymentAmount,
        customer_name: namaOwner,
        customer_email: email,
        customer_phone: nomorHp,
        order_items: [
          {
            sku: planId,
            name: `Langganan AGRAPos - ${planId.toUpperCase()}`,
            price: paymentAmount,
            quantity: 1
          }
        ],
        callback_url: callbackUrl,
        expired_time: Math.floor(Date.now() / 1000) + 24 * 3600
      };

      const response = await axios.post(
        TRIPAY_IS_SANDBOX
          ? 'https://tripay.co.id/api-sandbox/transaction/create'
          : 'https://tripay.co.id/api/transaction/create',
        tripayPayload,
        {
          headers: {
            Authorization: `Bearer ${TRIPAY_API_KEY}`
          }
        }
      );

      if (!response.data || !response.data.success) {
        return res.status(500).json({ error: `Tripay Inquiry Gagal: ${response.data.message || 'Unknown error'}` });
      }

      const tripayData = response.data.data;

      await supabase.from('tenant_billing').update({
        xendit_invoice_id: tripayData.reference,
        payment_method: method
      }).eq('id', billing.id);

      if (method === 'QRIS') {
        return res.status(200).json({
          success: true,
          billingId: billing.id,
          paymentData: {
            qrString: tripayData.qr_string || tripayData.qr_url || '',
            paymentId: tripayData.reference,
            referenceId
          }
        });
      } else {
        return res.status(200).json({
          success: true,
          billingId: billing.id,
          paymentData: {
            accountNumber: tripayData.pay_code || '',
            bankCode: bankCode.toUpperCase(),
            paymentId: tripayData.reference,
            referenceId
          }
        });
      }
    }

    if (DUITKU_MERCHANT_CODE && DUITKU_API_KEY) {
      const paymentAmount = Number(planPrice);
      const signature = md5(DUITKU_MERCHANT_CODE + referenceId + paymentAmount + DUITKU_API_KEY);
      
      let paymentMethodCode = '';
      if (method === 'QRIS') {
        paymentMethodCode = 'DQ';
      } else if (method === 'VA') {
        const bankMap = { 'BCA': 'BC', 'MANDIRI': 'M2', 'BRI': 'BR', 'BNI': 'B1' };
        paymentMethodCode = bankMap[bankCode.toUpperCase()] || 'VC';
      }

      const callbackUrl = `${cleanHostUrl.replace(/\/$/, '')}/api/duitku/callback`;
      const returnUrl = `${cleanHostUrl.replace(/\/$/, '')}/dashboard`;

      const response = await axios.post(
        DUITKU_IS_SANDBOX 
          ? 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'
          : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry',
        {
          merchantCode: DUITKU_MERCHANT_CODE,
          paymentAmount: paymentAmount,
          paymentMethod: paymentMethodCode,
          merchantOrderId: referenceId,
          productDetails: `Langganan AGRAPos - ${planId.toUpperCase()}`,
          email: email,
          phoneNumber: nomorHp,
          signature: signature,
          callbackUrl: callbackUrl,
          returnUrl: returnUrl,
          expiryPeriod: 1440
        }
      );

      if (response.data.statusCode !== '00') {
        return res.status(500).json({ error: `Duitku Inquiry Gagal: ${response.data.statusMessage || 'Unknown error'}` });
      }

      await supabase.from('tenant_billing').update({
        xendit_invoice_id: response.data.reference,
        payment_method: method
      }).eq('id', billing.id);

      if (method === 'QRIS') {
        return res.status(200).json({
          success: true,
          billingId: billing.id,
          paymentData: {
            qrString: response.data.qrContent || response.data.qrCode || response.data.paymentUrl || '',
            paymentId: response.data.reference,
            referenceId
          }
        });
      } else {
        return res.status(200).json({
          success: true,
          billingId: billing.id,
          paymentData: {
            accountNumber: response.data.vaNumber || '',
            bankCode: bankCode.toUpperCase(),
            paymentId: response.data.reference,
            referenceId
          }
        });
      }
    }

    if (method === 'QRIS') {
      const headers = {
        ...xenditAuthHeader,
        'api-version': '2022-07-31'
      };
      
      const response = await axios.post(
        'https://api.xendit.co/qr_codes',
        {
          reference_id: referenceId,
          type: 'DYNAMIC',
          currency: 'IDR',
          amount: Number(planPrice)
        },
        { headers }
      );

      // Simpan Xendit QR ID ke DB untuk simulate
      await supabase.from('tenant_billing').update({
        xendit_invoice_id: response.data.id,
        payment_method: 'QRIS'
      }).eq('id', billing.id);

      return res.status(200).json({
        success: true,
        billingId: billing.id,
        paymentData: {
          qrString: response.data.qr_string,
          paymentId: response.data.id,
          referenceId
        }
      });
    } else if (method === 'VA') {
      const headers = { ...xenditAuthHeader };
      
      const response = await axios.post(
        'https://api.xendit.co/callback_virtual_accounts',
        {
          external_id: referenceId,
          bank_code: bankCode.toUpperCase(),
          name: namaOwner || 'AGRAPos Subscriber',
          expected_amount: Number(planPrice),
          is_closed: true
        },
        { headers }
      );

      // Simpan Xendit VA ID ke database
      await supabase.from('tenant_billing').update({
        xendit_invoice_id: response.data.id,
        payment_method: 'VA'
      }).eq('id', billing.id);

      return res.status(200).json({
        success: true,
        billingId: billing.id,
        paymentData: {
          accountNumber: response.data.account_number,
          bankCode: response.data.bank_code,
          paymentId: response.data.id,
          referenceId
        }
      });
    }

    return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });

  } catch (error) {
    console.error('Subscription pending signup error:', error.message);
    if (error.response?.data) {
      console.error('Subscription pending signup error data:', error.response.data);
    }
    return res.status(500).json({ error: error.message || 'Terjadi kesalahan sistem saat mendaftarkan langganan.' });
  }
});

app.get('/api/saas/billing-status/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: billing, error } = await supabase
      .from('tenant_billing')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return res.status(200).json({
      success: true,
      paid: billing?.status === 'paid',
      status: billing?.status || 'pending'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/saas/simulate-billing-payment', async (req, res) => {
  const { billingId } = req.body;
  const isSandbox = (process.env.XENDIT_SECRET_KEY || '').includes('development') || 
                    (process.env.XENDIT_SECRET_KEY || '').includes('test');

  if (!isSandbox) {
    return res.status(403).json({ error: 'Simulasi hanya diperbolehkan di Test Mode.' });
  }

  try {
    const { data: billing, error: billingError } = await supabase
      .from('tenant_billing')
      .select('*')
      .eq('id', billingId)
      .single();

    if (billingError || !billing) {
      return res.status(404).json({ error: 'Billing ID tidak ditemukan.' });
    }

    if (billing.status === 'paid') {
      return res.status(200).json({ success: true, message: 'Billing sudah berstatus paid.' });
    }

    const referenceId = `BILL-${billingId}`;

    // Ambil Xendit Payment ID dari database (disimpan saat billing dibuat)
    const xenditPaymentId = billing.xendit_invoice_id;
    const paymentMethod = billing.payment_method || 'QRIS';

    let xenditQrId = (paymentMethod === 'QRIS') ? xenditPaymentId : null;
    let xenditVaId = (paymentMethod === 'VA') ? xenditPaymentId : null;

    if (xenditQrId) {
      // Simulasi pembayaran QRIS via Xendit API
      console.log(`[Simulate] Calling Xendit QRIS simulate for QR ID: ${xenditQrId}`);
      await axios.post(
        `https://api.xendit.co/qr_codes/${xenditQrId}/payments/simulate`,
        { amount: billing.amount },
        { headers: { ...xenditAuthHeader, 'api-version': '2022-07-31' } }
      );
      console.log(`[Simulate] Xendit QRIS simulate called. Xendit will send webhook to activate tenant.`);
      return res.status(200).json({
        success: true,
        message: 'Simulasi QRIS dikirim ke Xendit. Webhook akan segera mengaktifkan akun Anda.',
        method: 'QRIS'
      });
    } else if (xenditVaId) {
      // Simulasi pembayaran VA via Xendit API
      console.log(`[Simulate] Calling Xendit VA simulate for VA ID: ${xenditVaId}`);
      await axios.post(
        `https://api.xendit.co/callback_virtual_accounts/external_id=${referenceId}/simulate_payment`,
        { amount: billing.amount },
        { headers: xenditAuthHeader }
      );
      console.log(`[Simulate] Xendit VA simulate called. Webhook will activate tenant.`);
      return res.status(200).json({
        success: true,
        message: 'Simulasi VA dikirim ke Xendit. Webhook akan segera mengaktifkan akun Anda.',
        method: 'VA'
      });
    } else {
      // Fallback: tidak ada QR/VA di Xendit — update DB langsung (developer mode)
      console.log(`[Simulate] No Xendit payment found for ${referenceId}. Falling back to direct DB update.`);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('features')
        .eq('id', billing.plan_id)
        .maybeSingle();

      const planFeatures = planData?.features || ['pos', 'history', 'catalog', 'staff', 'settings'];

      await supabase.from('tenant_billing').update({
        status: 'paid',
        payment_method: 'SIMULATOR_TEST',
        paid_at: new Date().toISOString()
      }).eq('id', billingId);

      await supabase.from('tenants').update({
        status: 'active',
        plan_id: billing.plan_id,
        subscription_status: 'active',
        subscription_end_date: endDate.toISOString(),
        enabled_modules: planFeatures
      }).eq('tenant_id', billing.tenant_id);

      await supabase.from('tenant_subscriptions').upsert({
        tenant_id: billing.tenant_id,
        plan_id: billing.plan_id,
        status: 'active',
        current_period_end: endDate.toISOString(),
        updated_at: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Simulasi sukses (fallback DB)! Akun berhasil diaktifkan.',
        method: 'FALLBACK'
      });
    }
  } catch (err) {
    console.error('Simulation error:', err.response?.data || err.message);
    return res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});


app.post('/api/saas/create-upgrade-billing', async (req, res) => {
  const { tenantId, planId, method, bankCode } = req.body;

  if (!tenantId || !planId || !method) {
    return res.status(400).json({ error: 'Data input tidak lengkap!' });
  }

  try {
    // 1. Fetch tenant to make sure it exists
    const { data: tenant } = await supabase
      .from('tenants')
      .select('tenant_name')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant tidak ditemukan.' });
    }

    // 2. Fetch plan price
    const { data: planData } = await supabase
      .from('subscription_plans')
      .select('price_monthly')
      .eq('id', planId)
      .maybeSingle();

    if (!planData) {
      return res.status(404).json({ error: 'Plan tidak ditemukan.' });
    }

    const planPrice = planData.price_monthly;

    // 3. Create billing invoice in database
    const { data: billing, error: billingErr } = await supabase
      .from('tenant_billing')
      .insert({
        tenant_id: tenantId,
        plan_id: planId,
        amount: planPrice,
        status: 'pending'
      })
      .select()
      .single();

    if (billingErr) throw billingErr;

    const referenceId = `BILL-${billing.id}`;

    // 4. Create payment in Xendit (directly on Master, no subaccount header!)
    if (method === 'QRIS') {
      const headers = {
        ...xenditAuthHeader,
        'api-version': '2022-07-31'
      };
      
      const response = await axios.post(
        'https://api.xendit.co/qr_codes',
        {
          reference_id: referenceId,
          type: 'DYNAMIC',
          currency: 'IDR',
          amount: Number(planPrice)
        },
        { headers }
      );

      // Simpan Xendit QR ID ke DB untuk simulate
      await supabase.from('tenant_billing').update({
        xendit_invoice_id: response.data.id,
        payment_method: 'QRIS'
      }).eq('id', billing.id);

      return res.status(200).json({
        success: true,
        billingId: billing.id,
        paymentData: {
          qrString: response.data.qr_string,
          paymentId: response.data.id,
          referenceId
        }
      });
    } else if (method === 'VA') {
      const headers = { ...xenditAuthHeader };
      
      const response = await axios.post(
        'https://api.xendit.co/callback_virtual_accounts',
        {
          external_id: referenceId,
          bank_code: bankCode.toUpperCase(),
          name: tenant.tenant_name || 'AGRAPos Subscriber',
          expected_amount: Number(planPrice),
          is_closed: true
        },
        { headers }
      );

      return res.status(200).json({
        success: true,
        billingId: billing.id,
        paymentData: {
          accountNumber: response.data.account_number,
          bankCode: response.data.bank_code,
          paymentId: response.data.id,
          referenceId
        }
      });
    }

    return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
  } catch (error) {
    console.error('Error creating upgrade billing:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.message || error.message || 'Gagal generate pembayaran upgrade dari Xendit.',
    });
  }
});


app.post('/api/xendit/webhook-payment', async (req, res) => {

  const payload = req.body;
  const callbackToken = req.headers['x-callback-token'];
  console.log('[Webhook Payment Received]', JSON.stringify(payload));

  // 1. Verifikasi Xendit Callback Token (jika dikonfigurasi di environment)
  const expectedToken = process.env.XENDIT_CALLBACK_TOKEN;
  if (expectedToken && callbackToken !== expectedToken) {
    console.warn(`[Webhook Payment] Callback token tidak cocok. Dikirim: ${callbackToken}`);
    return res.status(401).send('Unauthorized callback token');
  }

  // 2. Ekstraksi data yang adaptif terhadap payload Virtual Account dan QRIS
  let transactionId = payload.external_id || 
                      payload.reference_id || 
                      payload.data?.reference_id || 
                      payload.data?.qr_code?.reference_id;
                      
  let amount = payload.amount || 
               payload.data?.amount || 
               payload.data?.qr_payment?.amount || 
               payload.data?.qr_code?.amount;
               
  let bankCode = payload.bank_code;

  if (!transactionId) {
    return res.status(400).send('Invalid webhook payload: Missing external_id or reference_id');
  }

  const externalIdStr = String(transactionId);

  // A. ROUTE TO SAAS BILLING / TOP-UP IF IT HAS PREFIX
  if (externalIdStr.startsWith('BILL-') || externalIdStr.startsWith('TOPUP-') || externalIdStr.startsWith('sub-payment-')) {
    console.log(`[Webhook Payment] Routing to SaaS Billing/Topup processor for ID: ${externalIdStr}`);
    
    if (externalIdStr.startsWith('TOPUP-')) {
      const parts = externalIdStr.split('-'); // e.g. TOPUP-{tenantId}-{outletId}-{timestamp}
      const tenantId = parts[1];
      let outletId = null;
      if (parts.length >= 4) {
        outletId = parts[2] !== 'null' ? Number(parts[2]) : null;
      }
      try {
        const { error } = await supabase.rpc('add_tenant_balance', {
          p_tenant_id: tenantId,
          p_outlet_id: outletId,
          p_amount: Number(amount),
          p_description: 'Top Up Deposit via ' + (payload.payment_method || 'Xendit'),
          p_ref_id: externalIdStr
        });
        if (error) throw error;
        console.log(`[Webhook SaaS] Sukses Top Up Saldo Rp ${amount} untuk tenant ${tenantId}`);
      } catch (err) {
        console.error('[Webhook SaaS TopUp Error]', err.message);
      }
    } else if (externalIdStr.startsWith('BILL-')) {
      const id = externalIdStr.replace('BILL-', '');
      try {
        const { data: billing } = await supabase.from('tenant_billing').select('*').eq('id', id).single();
        if (billing && billing.status !== 'paid') {
          await supabase.from('tenant_billing').update({
            status: 'paid',
            payment_method: payload.payment_method || 'XENDIT',
            paid_at: new Date().toISOString()
          }).eq('id', id);

          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);

          // Fetch plan features
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('features')
            .eq('id', billing.plan_id)
            .maybeSingle();

          const planFeatures = planData?.features || ['pos', 'history', 'catalog', 'staff', 'settings'];

          await supabase.from('tenants').update({
            status: 'active',
            plan_id: billing.plan_id,
            subscription_status: 'active',
            subscription_end_date: endDate.toISOString(),
            enabled_modules: planFeatures
          }).eq('tenant_id', billing.tenant_id);

          await supabase.from('tenant_subscriptions').upsert({
            tenant_id: billing.tenant_id,
            plan_id: billing.plan_id,
            status: 'active',
            current_period_end: endDate.toISOString(),
            updated_at: new Date().toISOString()
          });

          console.log(`[Webhook SaaS] Tenant ${billing.tenant_id} upgraded to ${billing.plan_id} with modules: ${JSON.stringify(planFeatures)}`);
        }
      } catch (err) {
        console.error('[Webhook SaaS Billing Error]', err.message);
      }
    }
    
    return res.status(200).send('OK');
  }

  // B. SAFELY IGNORE NON-NUMERIC PING/TEST IDS FROM XENDIT
  const isNumeric = /^\d+$/.test(externalIdStr);
  if (!isNumeric) {
    console.log(`[Webhook Payment] Mengabaikan non-numeric transactionId (test/ping dari Xendit): ${externalIdStr}`);
    return res.status(200).send('OK (Test/Ping Ignored)');
  }

  try {
    // 3. Ambil data transaksi dari Supabase (Aman karena ID dijamin berupa angka/bigint)
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', Number(externalIdStr))
      .maybeSingle();

    if (txError) throw txError;
    if (!tx) {
      console.warn(`[Webhook Payment] Transaksi ID ${transactionId} tidak ditemukan.`);
      return res.status(404).send('Transaction not found');
    }

    // 4. Validasi nominal pembayaran (amount) agar sesuai dengan total tagihan
    const expectedAmount = Math.round(Number(tx.total));
    const paidAmount = Math.round(Number(amount));
    
    if (isNaN(paidAmount) || paidAmount <= 0) {
      console.warn(`[Webhook Payment] Nominal pembayaran tidak valid: ${amount}`);
      return res.status(400).send('Invalid payment amount');
    }
    
    if (paidAmount < expectedAmount) {
      console.warn(`[Webhook Payment] Nominal bayar kurang! Tagihan: ${expectedAmount}, Dibayar: ${paidAmount}`);
      return res.status(400).send('Payment amount is less than transaction total');
    }

    // 5. Tentukan label pembayaran yang dinamis
    let paymentLabel = 'QRIS';
    if (bankCode) {
      paymentLabel = `Virtual Account (${bankCode})`;
    }

    // 6. Update status transaksi di database
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        payment_method: paymentLabel,
        status: 'completed',
        settlement_status: 'pending'
      })
      .eq('id', transactionId);

    if (updateError) throw updateError;

    console.log(`[Webhook Payment] Sukses memproses pembayaran transaksi #${transactionId} senilai Rp ${paidAmount} via ${paymentLabel}.`);

    // 7. Cek apakah ada PPOB, jika ada hit Digiflazz
    const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : (tx.items || []);
    const ppobItems = items.filter(i => i.is_ppob);
    if (ppobItems.length > 0) {
      const { data: settings } = await supabase.from('ppob_settings').select('*').is('tenant_id', null).maybeSingle();
      if (settings?.api_username && settings?.api_key) {
        for (const ppob of ppobItems) {
          const ref_id = `ppob-${tx.tenant_id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const sign = crypto.createHash('md5').update(settings.api_username + settings.api_key + ref_id).digest('hex');
          
          // Simpan ke ppob_transactions
          await supabase.from('ppob_transactions').insert({
            transaction_id: tx.id,
            tenant_id: tx.tenant_id,
            outlet_id: tx.outlet_id ? Number(tx.outlet_id) : null,
            customer_number: ppob.ppob_target,
            sku_code: ppob.ppob_sku,
            product_name: ppob.name,
            base_price: Number(ppob.price), // asumsi price adalah modal
            selling_price: Number(ppob.price),
            ref_id,
            status: 'Pending'
          });

          // Hit Digiflazz
          axios.post(`${DIGIFLAZZ_URL}/transaction`, {
            username: settings.api_username,
            buyer_sku_code: ppob.ppob_sku,
            customer_no: ppob.ppob_target,
            ref_id, sign
          }).then(async (dfRes) => {
            const dfStatus = dfRes.data?.data?.status;
            if (dfStatus === 'Gagal') {
              await supabase.from('ppob_transactions').update({ status: 'Failed' }).eq('ref_id', ref_id);
            } else if (dfStatus === 'Sukses') {
              await supabase.from('ppob_transactions').update({ status: 'Success', sn: dfRes.data.data.sn }).eq('ref_id', ref_id);
            }
          }).catch(console.error);
        }
      }
    }
    return res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook Payment Error]', error.message);
    return res.status(500).send('Internal Server Error');
  }
});

app.post('/api/xendit/static-qr', async (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID tidak boleh kosong!' });
  }

  try {
    const { data: settingsList, error: dbError } = await supabase
      .from('payment_settings')
      .select('xendit_merchant_id')
      .eq('tenant_id', tenantId)
      .not('xendit_merchant_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (dbError) throw dbError;
    const settings = settingsList?.[0];
    const rawId = settings?.xendit_merchant_id || '';

    if (rawId.startsWith('IPAYMU|')) {
      const parts = rawId.split('|');
      const tenantVa = parts[1] || '';
      return res.status(200).json({
        success: true,
        qrString: `https://ipaymu.com/qr/${tenantVa}`,
      });
    }

    const xenditMerchantId = rawId.split('|')[0];

    if (!xenditMerchantId || xenditMerchantId === 'ID-AGRAPOS-BYPASS') {
      return res.status(200).json({
        success: true,
        qrString: `https://agrapos.dev/merchant/ID-AGRAPOS-BYPASS`,
      });
    }

    const referenceId = `static-qr-${tenantId}`;
    try {
      const headers = {
        ...xenditAuthHeader,
        'api-version': '2022-07-31'
      };
      if (xenditMerchantId && xenditMerchantId !== 'MASTER') {
        headers['for-user-id'] = xenditMerchantId;
      }

      const response = await axios.post(
        'https://api.xendit.co/qr_codes',
        {
          reference_id: referenceId,
          type: 'STATIC',
          currency: 'IDR'
        },
        { headers }
      );

      return res.status(200).json({
        success: true,
        qrString: response.data.qr_string,
      });
    } catch (error) {
      const xenditError = error.response?.data;
      if (xenditError?.error_code === 'DUPLICATE_ERROR' && xenditError.existing) {
        const headers = {
          ...xenditAuthHeader,
          'api-version': '2022-07-31'
        };
        if (xenditMerchantId && xenditMerchantId !== 'MASTER') {
          headers['for-user-id'] = xenditMerchantId;
        }

        const getResponse = await axios.get(
          `https://api.xendit.co/qr_codes/${xenditError.existing}`,
          { headers }
        );
        return res.status(200).json({
          success: true,
          qrString: getResponse.data.qr_string,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error Static QR:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.message || error.message || 'Gagal mengambil static QRIS dari Xendit.',
    });
  }
});

app.post('/api/xendit/fixed-vas', async (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID tidak boleh kosong!' });
  }

  try {
    const { data: settingsList, error: dbError } = await supabase
      .from('payment_settings')
      .select('xendit_merchant_id')
      .eq('tenant_id', tenantId)
      .not('xendit_merchant_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (dbError) throw dbError;
    const settings = settingsList?.[0];
    const rawId = settings?.xendit_merchant_id || '';

    if (rawId.startsWith('IPAYMU|')) {
      const parts = rawId.split('|');
      const tenantVa = parts[1] || '';
      const ipaymuVas = [
        { bank_code: 'IPAYMU', account_number: tenantVa, name: 'iPaymu Virtual Account' }
      ];
      return res.status(200).json({ success: true, vas: ipaymuVas });
    }

    const xenditMerchantId = rawId.split('|')[0];

    if (!xenditMerchantId || xenditMerchantId === 'ID-AGRAPOS-BYPASS') {
      const suffix = String(tenantId).replace(/\D/g, '').substring(0, 7) || '1234567';
      const simulasiVas = [
        { bank_code: 'BCA', account_number: `70070${suffix}`, name: 'Simulasi BCA' },
        { bank_code: 'MANDIRI', account_number: `89407${suffix}`, name: 'Simulasi MANDIRI' },
        { bank_code: 'BNI', account_number: `8810${suffix}`, name: 'Simulasi BNI' },
        { bank_code: 'BRI', account_number: `26215${suffix}`, name: 'Simulasi BRI' },
      ];
      return res.status(200).json({ success: true, vas: simulasiVas });
    }

    const dataPath = path.resolve('data', 'xendit_vas.json');
    let vasCache = {};
    if (fs.existsSync(dataPath)) {
      try { vasCache = JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch (e) {}
    }

    let tenantVAs = vasCache[tenantId] || [];
    const requiredBanks = ['BCA', 'MANDIRI', 'BNI', 'BRI'];
    const currentBanks = tenantVAs.map(va => (va.bank_code || '').toUpperCase());
    let createdNew = false;

    for (const bank of requiredBanks) {
      if (!currentBanks.includes(bank)) {
        try {
          const { data: tenantData } = await supabase.from('tenants').select('tenant_name').eq('tenant_id', tenantId).maybeSingle();
          const vaName = tenantData?.tenant_name || 'Toko ' + tenantId;
          
          const headers = { ...xenditAuthHeader };
          if (xenditMerchantId && xenditMerchantId !== 'MASTER') {
            headers['for-user-id'] = xenditMerchantId;
          }
          
          const createResponse = await axios.post(
            'https://api.xendit.co/callback_virtual_accounts',
            {
              external_id: `fixed-va-${tenantId}-${bank.toLowerCase()}`,
              bank_code: bank,
              name: vaName,
              is_closed: false
            },
            { headers }
          );
          tenantVAs.push(createResponse.data);
          createdNew = true;
        } catch (err) {
          console.error(`Failed to create fixed VA for ${bank}:`, err.response?.data || err.message);
        }
      }
    }

    if (createdNew) {
      vasCache[tenantId] = tenantVAs;
      fs.writeFileSync(dataPath, JSON.stringify(vasCache, null, 2), 'utf8');
    }

    return res.status(200).json({
      success: true,
      vas: tenantVAs,
      createdNew
    });
  } catch (error) {
    console.error('Error fetching fixed VAs:', error.message);
    return res.status(500).json({
      error: 'Gagal mengambil fixed VA dari Xendit.',
    });
  }
});

// ==========================================
// PPOB & DIGIFLAZZ INTEGRATION
// ==========================================

const DIGIFLAZZ_URL = 'https://api.digiflazz.com/v1';

// Get or update PPOB settings (Super Admin only - in a real app, verify admin token)
app.get('/api/ppob/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ppob_settings')
      .select('*')
      .is('tenant_id', null)
      .maybeSingle();
      
    if (error) throw error;
    return res.status(200).json({ success: true, settings: data || {} });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ppob/settings', async (req, res) => {
  const { api_username, api_key, global_markup } = req.body;
  try {
    const { data: existing } = await supabase.from('ppob_settings').select('id').is('tenant_id', null).maybeSingle();
    let data, error;
    
    if (existing) {
      ({ data, error } = await supabase.from('ppob_settings').update({ 
        api_username, 
        api_key, 
        global_markup: Number(global_markup) || 0,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id).select().maybeSingle());
    } else {
      ({ data, error } = await supabase.from('ppob_settings').insert({ 
        tenant_id: null, 
        api_username, 
        api_key, 
        global_markup: Number(global_markup) || 0
      }).select().maybeSingle());
    }
      
    if (error) throw error;
    return res.status(200).json({ success: true, settings: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Helper to generate Digiflazz Sign
const generateSign = (username, apiKey, refId) => {
  return crypto.createHash('md5').update(username + apiKey + refId).digest('hex');
};

// Fetch price list from local DB (For Tenants)
app.post('/api/ppob/price-list', async (req, res) => {
  const { cmd = 'prepaid' } = req.body;
  try {
    const { data: settings } = await supabase.from('ppob_settings').select('*').is('tenant_id', null).maybeSingle();
    const markup = settings?.global_markup || 0;

    // Fetch active products from local db
    const { data: productsData, error } = await supabase
      .from('ppob_products')
      .select('*')
      .eq('is_active', true)
      .eq('buyer_product_status', true);
      
    if (error) throw error;

    const products = (productsData || []).map(p => ({
      ...p,
      price: Number(p.base_price) + markup
    }));

    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error('PPOB Local Price List Error:', error.message);
    return res.status(500).json({ error: 'Gagal mengambil daftar harga PPOB dari database.' });
  }
});

// Sync products from Digiflazz (For Super Admin)
app.post('/api/ppob/sync-products', async (req, res) => {
  const { cmd = 'prepaid' } = req.body;
  try {
    const { data: settings } = await supabase.from('ppob_settings').select('*').is('tenant_id', null).maybeSingle();
    if (!settings?.api_username || !settings?.api_key) {
      return res.status(400).json({ error: 'PPOB API belum dikonfigurasi.' });
    }

    const sign = generateSign(settings.api_username, settings.api_key, 'pricelist');
    const response = await axios.post(`${DIGIFLAZZ_URL}/price-list`, {
      cmd,
      username: settings.api_username,
      sign
    });

    const responseData = response.data?.data;
    if (!Array.isArray(responseData)) {
      throw new Error(responseData?.message || 'Gagal mengambil data dari Digiflazz');
    }

    // Upsert data into ppob_products
    const productsToUpsert = responseData.map(p => ({
      sku_code: p.buyer_sku_code,
      product_name: p.product_name,
      category: p.category,
      brand: p.brand,
      type: p.type,
      seller_name: p.seller_name,
      base_price: p.price,
      buyer_product_status: p.buyer_product_status,
      seller_product_status: p.seller_product_status,
      unlimited_stock: p.unlimited_stock,
      stock: p.stock,
      multi: p.multi,
      start_cut_off: p.start_cut_off,
      end_cut_off: p.end_cut_off,
      desc_text: p.desc,
      updated_at: new Date().toISOString()
    }));

    // Batch upsert to Supabase
    // We do it in chunks of 500 to avoid request size limits
    const chunkSize = 500;
    for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
      const chunk = productsToUpsert.slice(i, i + chunkSize);
      const { error } = await supabase.from('ppob_products').upsert(chunk, { onConflict: 'sku_code' });
      if (error) console.error('PPOB Sync Chunk Error:', error.message);
    }

    return res.status(200).json({ success: true, count: productsToUpsert.length });
  } catch (error) {
    console.error('PPOB Sync Error:', error.response?.data || error.message);
    return res.status(500).json({ error: error.message || 'Gagal sinkronisasi produk PPOB.' });
  }
});

// Get all products (For Super Admin)
app.get('/api/ppob/products-admin', async (req, res) => {
  try {
    const { data, error } = await supabase.from('ppob_products').select('*').order('brand', { ascending: true }).order('base_price', { ascending: true });
    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Toggle product active status (For Super Admin)
app.post('/api/ppob/toggle-product', async (req, res) => {
  const { sku_code, is_active } = req.body;
  try {
    const { error } = await supabase.from('ppob_products').update({ is_active }).eq('sku_code', sku_code);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Perform PPOB Transaction
app.post('/api/ppob/transaction', async (req, res) => {
  const { tenantId, outletId, transactionId, customerNumber, skuCode, productName, sellingPrice } = req.body;
  
  if (!tenantId || !customerNumber || !skuCode) {
    return res.status(400).json({ error: 'Data transaksi PPOB tidak lengkap.' });
  }

  try {
    const { data: settings } = await supabase.from('ppob_settings').select('*').is('tenant_id', null).maybeSingle();
    if (!settings?.api_username || !settings?.api_key) {
      return res.status(400).json({ error: 'PPOB API belum dikonfigurasi.' });
    }

    const refId = `PPOB-${tenantId}-${Date.now()}`;
    const sign = generateSign(settings.api_username, settings.api_key, refId);

    // Save initial transaction to DB as Pending
    const { data: dbTx, error: dbError } = await supabase.from('ppob_transactions').insert({
      tenant_id: tenantId,
      outlet_id: outletId ? Number(outletId) : null,
      transaction_id: transactionId || null,
      customer_number: customerNumber,
      sku_code: skuCode,
      product_name: productName,
      base_price: 0, // Will be updated
      selling_price: Number(sellingPrice) || 0,
      ref_id: refId,
      status: 'Pending'
    }).select().maybeSingle();

    if (dbError) throw dbError;

    // Hit Digiflazz API
    const response = await axios.post(`${DIGIFLAZZ_URL}/transaction`, {
      username: settings.api_username,
      buyer_sku_code: skuCode,
      customer_no: customerNumber,
      ref_id: refId,
      sign,
      testing: false // Set true for sandbox
    });

    const dfResult = response.data?.data;
    const finalStatus = dfResult?.status; // Pending, Sukses, Gagal
    const sn = dfResult?.sn || '';
    const basePrice = dfResult?.price || 0;

    // Update DB with actual result
    await supabase.from('ppob_transactions').update({
      status: finalStatus,
      sn,
      base_price: basePrice
    }).eq('id', dbTx.id);

    return res.status(200).json({ success: true, data: dfResult });
  } catch (error) {
    console.error('PPOB Tx Error (Digiflazz):', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Transaksi PPOB gagal diproses oleh sistem pusat. Silakan coba lagi nanti.' 
    });
  }
});

// PPOB Webhook (Digiflazz will call this)
app.post('/api/ppob/webhook', async (req, res) => {
  try {
    const payload = req.body?.data;
    if (!payload) return res.status(400).send('Invalid payload');

    const refId = payload.ref_id;
    const status = payload.status;
    const sn = payload.sn;
    const price = payload.price;

    await supabase.from('ppob_transactions').update({
      status: status,
      sn: sn,
      base_price: price,
      updated_at: new Date().toISOString()
    }).eq('ref_id', refId);

    console.log(`[PPOB Webhook] Updated ${refId} to ${status}`);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[PPOB Webhook Error]', err.message);
    return res.status(500).send('Error');
  }
});

// ==========================================
// SAAS BILLING, GMV, & BROADCAST
// ==========================================

// Global GMV (Super Admin)
app.get('/api/saas/gmv', async (req, res) => {
  try {
    const { data: txs, error } = await supabase
      .from('transactions')
      .select('total, created_at, tenant_id')
      .neq('status', 'cancelled');
    
    if (error) throw error;
    
    let totalGMV = 0;
    let tenantCount = new Set();
    txs.forEach(t => {
      totalGMV += Number(t.total) || 0;
      if (t.tenant_id) tenantCount.add(t.tenant_id);
    });

    const { data: ppobTxs } = await supabase.from('ppob_transactions').select('selling_price, base_price, status').eq('status', 'Sukses');
    let ppobProfit = 0;
    (ppobTxs || []).forEach(p => {
      ppobProfit += (Number(p.selling_price) - Number(p.base_price));
    });

    return res.json({ 
      success: true, 
      gmv: totalGMV, 
      active_tenants: tenantCount.size,
      ppob_profit: ppobProfit
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Broadcast Messages
app.get('/api/saas/broadcasts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('broadcast_messages')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/saas/broadcasts', async (req, res) => {
  const { title, message, type, show_as_popup, image, button_text, button_url } = req.body;
  try {
    const { data, error } = await supabase
      .from('broadcast_messages')
      .insert([{ 
        title, 
        message, 
        type, 
        show_as_popup: !!show_as_popup,
        image: image || null,
        button_text: button_text || null,
        button_url: button_url || null
      }])
      .select();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/saas/broadcasts/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('broadcast_messages').update({ is_active: false }).eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// SaaS Subscription Checkout (Generate Xendit Invoice)
app.post('/api/saas/subscribe', async (req, res) => {
  const { tenantId, planId, price, planName } = req.body;
  if (!tenantId || !planId || !price) return res.status(400).json({ error: 'Data tidak lengkap' });

  try {
    const { data: tenant } = await supabase.from('tenants').select('*').eq('tenant_id', tenantId).single();
    if (!tenant) throw new Error('Tenant tidak ditemukan');

    const extId = `SAAS-${tenantId}-${Date.now()}`;
    
    // Create DB Record
    const { data: billing, error: dbErr } = await supabase.from('tenant_billing').insert({
      tenant_id: tenantId,
      plan_id: planId,
      amount: price,
      status: 'pending'
    }).select().single();
    
    if (dbErr) throw dbErr;

    // Create Invoice to Xendit
    const response = await axios.post(
      'https://api.xendit.co/v2/invoices',
      {
        external_id: `BILL-${billing.id}`,
        amount: price,
        description: `Langganan ${planName} - ${tenant.name}`,
        customer: {
          given_names: tenant.name,
          email: tenant.email || 'no-email@agrapos.com'
        },
        success_redirect_url: `https://agrapos.dev/dashboard`,
        failure_redirect_url: `https://agrapos.dev/dashboard`
      },
      {
        auth: { username: XENDIT_KEY, password: '' },
      }
    );

    const invoiceUrl = response.data.invoice_url;
    
    // Update billing with invoice URL
    await supabase.from('tenant_billing').update({
      xendit_invoice_id: response.data.id,
      xendit_invoice_url: invoiceUrl
    }).eq('id', billing.id);

    return res.json({ success: true, invoice_url: invoiceUrl });
  } catch (err) {
    console.error('SaaS Subscribe Error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Gagal membuat tagihan berlangganan.' });
  }
});

// SaaS Webhook Callback from Xendit
app.post('/api/saas/webhook', async (req, res) => {
  const payload = req.body;
  const callbackToken = req.headers['x-callback-token'];

  // Verifikasi Callback Token jika dikonfigurasi di env
  const expectedToken = process.env.XENDIT_CALLBACK_TOKEN;
  if (expectedToken && callbackToken !== expectedToken) {
    console.warn(`[SaaS Webhook] Callback token tidak cocok. Dikirim: ${callbackToken}`);
    return res.status(401).send('Unauthorized callback token');
  }

  console.log('[SaaS Webhook Received]', payload.external_id, payload.status);

  if (payload.status === 'PAID' || payload.status === 'SETTLED') {
    const externalIdStr = payload.external_id || '';

    // 1. Handle TOP-UP SALDO PPOB
    if (externalIdStr.startsWith('TOPUP-')) {
      const parts = externalIdStr.split('-'); // e.g. TOPUP-{tenantId}-{outletId}-{timestamp}
      const tenantId = parts[1];
      let outletId = null;
      if (parts.length >= 4) {
        outletId = parts[2] !== 'null' ? Number(parts[2]) : null;
      }
      const amount = payload.amount;
      
      try {
        const { error } = await supabase.rpc('add_tenant_balance', {
          p_tenant_id: tenantId,
          p_outlet_id: outletId,
          p_amount: amount,
          p_description: 'Top Up Deposit via ' + (payload.payment_method || 'Xendit'),
          p_ref_id: externalIdStr
        });
        if (error) throw error;
        console.log(`[SaaS Webhook] Sukses Top Up Saldo Rp ${amount} untuk tenant ${tenantId} outlet ${outletId}`);
      } catch (err) {
        console.error('[SaaS Webhook TopUp Error]', err.message);
      }
      return res.status(200).send('OK');
    }

    // 2. Handle LANGGANAN SAAS (BILL-...)
    if (externalIdStr.startsWith('BILL-')) {
      const id = externalIdStr.replace('BILL-', '');
    
    try {
      const { data: billing } = await supabase.from('tenant_billing').select('*').eq('id', id).single();
      if (billing && billing.status !== 'paid') {
        // Mark as paid
        await supabase.from('tenant_billing').update({
          status: 'paid',
          payment_method: payload.payment_method || 'XENDIT',
          paid_at: new Date().toISOString()
        }).eq('id', id);

        // Update Tenant Subscription
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // assume monthly for now
        
        await supabase.from('tenants').update({
          plan_id: billing.plan_id,
          subscription_status: 'active',
          subscription_end_date: endDate.toISOString()
        }).eq('tenant_id', billing.tenant_id);

        console.log(`[SaaS Webhook] Tenant ${billing.tenant_id} upgraded to ${billing.plan_id}`);
      }
    } catch (err) {
      console.error('[SaaS Webhook DB Error]', err.message);
    }
  }
  }

  return res.status(200).send('OK');
});

// Duitku Callback Webhook
app.post('/api/duitku/callback', async (req, res) => {
  const { merchantCode, amount, merchantOrderId, signature, resultCode, reference } = req.body;

  try {
    console.log('[Duitku Callback Received]', req.body);

    const expectedSignature = md5(merchantCode + amount + merchantOrderId + DUITKU_API_KEY);
    if (signature !== expectedSignature) {
      console.error('[Duitku Callback] Invalid signature');
      return res.status(400).send('Invalid signature');
    }

    if (resultCode !== '00') {
      console.log(`[Duitku Callback] Payment failed/pending with code: ${resultCode}`);
      return res.status(200).send('OK');
    }

    if (merchantOrderId && merchantOrderId.startsWith('BILL-')) {
      const billingId = Number(merchantOrderId.replace('BILL-', ''));

      const { data: billing } = await supabase
        .from('tenant_billing')
        .select('*')
        .eq('id', billingId)
        .maybeSingle();

      if (!billing) {
        return res.status(404).send('Billing not found');
      }

      if (billing.status === 'paid') {
        return res.status(200).send('OK');
      }

      await supabase.from('tenant_billing').update({
        status: 'paid',
        paid_at: new Date().toISOString()
      }).eq('id', billingId);

      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('features')
        .eq('id', billing.plan_id)
        .maybeSingle();

      const planFeatures = planData?.features || ['pos', 'history', 'catalog', 'staff', 'settings'];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await supabase.from('tenants').update({
        status: 'active',
        plan_id: billing.plan_id,
        subscription_status: 'active',
        subscription_end_date: endDate.toISOString(),
        enabled_modules: planFeatures
      }).eq('tenant_id', billing.tenant_id);

      await supabase.from('tenant_subscriptions').upsert({
        tenant_id: billing.tenant_id,
        plan_id: billing.plan_id,
        status: 'active',
        current_period_end: endDate.toISOString()
      });

      console.log(`[Duitku Callback Success] Tenant ${billing.tenant_id} upgraded successfully.`);
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[Duitku Callback Error]', err.message);
    return res.status(500).send('Internal Server Error');
  }
});

// Tripay Callback Webhook
app.post('/api/tripay/callback', async (req, res) => {
  const callbackSignature = req.headers['x-callback-signature'];
  const jsonPayload = req.body;

  try {
    console.log('[Tripay Callback Received]', jsonPayload);

    const rawBody = JSON.stringify(jsonPayload);
    const expectedSignature = crypto
      .createHmac('sha256', TRIPAY_PRIVATE_KEY)
      .update(rawBody)
      .digest('hex');

    const isVerified = (callbackSignature === expectedSignature);
    if (!isVerified) {
      console.warn('[Tripay Callback Warning] Signature mismatch. expected:', expectedSignature, 'got:', callbackSignature);
      if (!TRIPAY_IS_SANDBOX) {
        return res.status(400).send('Invalid signature');
      }
    }

    const { status, merchant_ref, reference } = jsonPayload;

    if (status !== 'PAID') {
      console.log(`[Tripay Callback] Payment status is ${status}, ignoring.`);
      return res.status(200).json({ success: true });
    }

    if (merchant_ref && merchant_ref.startsWith('BILL-')) {
      const billingId = Number(merchant_ref.replace('BILL-', ''));

      const { data: billing } = await supabase
        .from('tenant_billing')
        .select('*')
        .eq('id', billingId)
        .maybeSingle();

      if (!billing) {
        return res.status(404).send('Billing not found');
      }

      if (billing.status === 'paid') {
        return res.status(200).json({ success: true });
      }

      await supabase.from('tenant_billing').update({
        status: 'paid',
        paid_at: new Date().toISOString()
      }).eq('id', billingId);

      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('features')
        .eq('id', billing.plan_id)
        .maybeSingle();

      const planFeatures = planData?.features || ['pos', 'history', 'catalog', 'staff', 'settings'];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await supabase.from('tenants').update({
        status: 'active',
        plan_id: billing.plan_id,
        subscription_status: 'active',
        subscription_end_date: endDate.toISOString(),
        enabled_modules: planFeatures
      }).eq('tenant_id', billing.tenant_id);

      await supabase.from('tenant_subscriptions').upsert({
        tenant_id: billing.tenant_id,
        plan_id: billing.plan_id,
        status: 'active',
        current_period_end: endDate.toISOString()
      });

      console.log(`[Tripay Callback Success] Tenant ${billing.tenant_id} upgraded successfully.`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Tripay Callback Error]', err.message);
    return res.status(500).send('Internal Server Error');
  }
});

// iPaymu Callback Webhook
app.post('/api/ipaymu/callback', async (req, res) => {
  const { trx_id, status, amount } = req.body;
  const refId = req.body.reference_id || req.body.referenceId || req.body.sid || req.body.reference;

  try {
    console.log('[iPaymu Callback Received]', req.body);

    const isSuccess = (status === 'berhasil' || status === 'paid' || status === 'settled');
    if (!isSuccess) {
      console.log(`[iPaymu Callback] Status is ${status}, ignoring.`);
      return res.status(200).send('OK');
    }

    if (refId && refId.startsWith('BILL-')) {
      const billingId = Number(refId.replace('BILL-', ''));

      const { data: billing } = await supabase
        .from('tenant_billing')
        .select('*')
        .eq('id', billingId)
        .maybeSingle();

      if (!billing) {
        return res.status(404).send('Billing not found');
      }

      if (billing.status === 'paid') {
        return res.status(200).send('OK');
      }

      await supabase.from('tenant_billing').update({
        status: 'paid',
        paid_at: new Date().toISOString()
      }).eq('id', billingId);

      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('features')
        .eq('id', billing.plan_id)
        .maybeSingle();

      const planFeatures = planData?.features || ['pos', 'history', 'catalog', 'staff', 'settings'];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await supabase.from('tenants').update({
        status: 'active',
        plan_id: billing.plan_id,
        subscription_status: 'active',
        subscription_end_date: endDate.toISOString(),
        enabled_modules: planFeatures
      }).eq('tenant_id', billing.tenant_id);

      await supabase.from('tenant_subscriptions').upsert({
        tenant_id: billing.tenant_id,
        plan_id: billing.plan_id,
        status: 'active',
        current_period_end: endDate.toISOString()
      });

      console.log(`[iPaymu Callback Success] Tenant ${billing.tenant_id} upgraded successfully.`);
    } else if (refId) {
      // POS Transaction
      const transactionId = Number(refId.replace('TX-', ''));
      if (!isNaN(transactionId)) {
        console.log(`[iPaymu Callback] Processing POS Transaction ID: ${transactionId}`);

        const { data: tx, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .maybeSingle();

        if (txError) throw txError;
        if (tx) {
          if (tx.status !== 'completed' || tx.payment_method === 'Belum Lunas') {
            const { error: updateError } = await supabase
              .from('transactions')
              .update({
                payment_method: 'QRIS (iPaymu)',
                status: 'completed',
                settlement_status: 'completed'
              })
              .eq('id', transactionId);

            if (updateError) throw updateError;
            console.log(`[iPaymu Callback] Sukses memproses pembayaran transaksi #${transactionId} via iPaymu.`);
          }
        } else {
          console.warn(`[iPaymu Callback] Transaksi ID ${transactionId} tidak ditemukan.`);
        }
      }
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[iPaymu Callback Error]', err.message);
    return res.status(500).send('Internal Server Error');
  }
});

// ==========================================
// PPOB DIRECT & BALANCE CHECKOUT
// ==========================================

// Helper function to get unified mutations
async function getUnifiedMutations(tenant_id, outlet_id, start_date, end_date, search, limit = 100) {
  // 1. Fetch balance_mutations
  let query = supabase.from('balance_mutations').select('*').eq('tenant_id', tenant_id).order('created_at', { ascending: false });
  if (outlet_id) {
    query = query.or(`outlet_id.eq.${outlet_id},outlet_id.is.null`);
  }
  
  if (start_date) query = query.gte('created_at', `${start_date}T00:00:00Z`);
  if (end_date) query = query.lte('created_at', `${end_date}T23:59:59Z`);
  if (!search) query = query.limit(limit);

  const { data: mutationsData, error: mutErr } = await query;
  if (mutErr) throw mutErr;

  // 2. Fetch manual_deposit_requests (pending/rejected)
  let manualQuery = supabase.from('manual_deposit_requests').select('*').eq('tenant_id', tenant_id).in('status', ['pending', 'rejected']);
  if (outlet_id) {
    manualQuery = manualQuery.or(`outlet_id.eq.${outlet_id},outlet_id.is.null`);
  }
  
  if (start_date) manualQuery = manualQuery.gte('created_at', `${start_date}T00:00:00Z`);
  if (end_date) manualQuery = manualQuery.lte('created_at', `${end_date}T23:59:59Z`);
  
  const { data: manualData, error: manErr } = await manualQuery;
  if (manErr) throw manErr;

  // 3. Fetch tenant_withdrawals (pending/rejected)
  let withdrawQuery = supabase.from('tenant_withdrawals').select('*').eq('tenant_id', tenant_id).in('status', ['pending', 'rejected']);
  // withdrawals don't have outlet_id currently, but we filter if outlet_id is provided?
  // Withdrawals are usually at tenant level. If outlet_id is present, we might skip it or still show it. Let's show it anyway or skip?
  // Withdrawals have no outlet_id column. We will just fetch them if it's the main tenant, but since outlet_id might be passed, let's fetch them anyway because balance is shared!
  if (start_date) withdrawQuery = withdrawQuery.gte('created_at', `${start_date}T00:00:00Z`);
  if (end_date) withdrawQuery = withdrawQuery.lte('created_at', `${end_date}T23:59:59Z`);
  
  const { data: withdrawData, error: wdErr } = await withdrawQuery;
  if (wdErr) throw wdErr;

  // Map to unified format
  const mappedMutations = (mutationsData || []).map(mut => ({
    ...mut,
    status: 'Berhasil'
  }));

  const mappedManual = (manualData || []).map(r => ({
    id: `req_${r.id}`,
    amount: r.amount,
    type: 'in',
    description: 'Top Up Deposit Manual',
    created_at: r.created_at,
    ref_id: `REQ-${r.id}`,
    status: r.status === 'pending' ? 'Pending' : 'Ditolak'
  }));

  const mappedWithdrawals = (withdrawData || []).map(r => ({
    id: `wd_${r.id}`,
    amount: r.amount,
    type: 'out',
    description: `Penarikan Tunai (${r.bank_name})`,
    created_at: r.created_at,
    ref_id: `WD-${r.id}`,
    status: r.status === 'pending' ? 'Pending' : 'Ditolak'
  }));

  let combined = [...mappedMutations, ...mappedManual, ...mappedWithdrawals];
  combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Universal search
  if (search && search.trim()) {
    const searchLower = search.trim().toLowerCase();
    const isNumericSearch = /^[\d.,\s]+$/.test(search.trim());
    const searchDigits = search.trim().replace(/[^0-9]/g, '');
    
    combined = combined.filter(m => {
      const desc = (m.description || '').toLowerCase();
      const refId = (m.ref_id || String(m.id || '')).toLowerCase();
      const status = (m.status || '').toLowerCase();
      const type = (m.type || '').toLowerCase();
      
      if (desc.includes(searchLower)) return true;
      if (refId.includes(searchLower)) return true;
      if (status.includes(searchLower)) return true;
      if (type.includes(searchLower)) return true;
      
      if (isNumericSearch && searchDigits) {
        const amountNum = Math.abs(Number(m.amount) || 0);
        const amountStr = String(amountNum);
        const amountFormatted = amountNum.toLocaleString('id-ID');
        if (amountStr.includes(searchDigits)) return true;
        if (amountFormatted.includes(search.trim())) return true;
      }
      return false;
    });
  } else {
    combined = combined.slice(0, limit);
  }

  return combined;
}

// Get Tenant Balance & Mutations
app.get('/api/ppob/balance', async (req, res) => {
  const { tenant_id, outlet_id } = req.query;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });
  try {
    let balance = 0;
    if (outlet_id) {
      const { data: balanceData } = await supabase.from('tenant_balances')
        .select('balance')
        .eq('tenant_id', tenant_id)
        .eq('outlet_id', outlet_id)
        .maybeSingle();
      balance = balanceData?.balance || 0;
    } else {
      const { data: balances } = await supabase.from('tenant_balances')
        .select('balance')
        .eq('tenant_id', tenant_id);
      balance = (balances || []).reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
    }
    
    const unifiedMutations = await getUnifiedMutations(tenant_id, outlet_id, null, null, null, 20);
    
    return res.json({ success: true, balance, mutations: unifiedMutations });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get Tenant Mutations History (With Filters)
app.get('/api/ppob/history', async (req, res) => {
  const { tenant_id, outlet_id, start_date, end_date, search } = req.query;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

  try {
    const unifiedMutations = await getUnifiedMutations(tenant_id, outlet_id, start_date, end_date, search, 100);
    return res.json({ success: true, mutations: unifiedMutations });
  } catch (err) {
    console.error('[ppob/history error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Super Admin: Get All Deposit History (With Filters)
app.get('/api/saas/deposit-history', async (req, res) => {
  const { start_date, end_date, search } = req.query;

  try {
    // 1) Fetch balance_mutations (approved deposits)
    let query = supabase.from('balance_mutations')
      .select('*, tenants(tenant_name)')
      .gt('amount', 0)
      .order('created_at', { ascending: false });

    if (start_date) query = query.gte('created_at', `${start_date}T00:00:00Z`);
    if (end_date) query = query.lte('created_at', `${end_date}T23:59:59Z`);
    if (!search) query = query.limit(500);

    const { data: mutationsData, error } = await query;
    if (error) throw error;

    // 2) Fetch rejected manual deposit requests
    let manualQuery = supabase.from('manual_deposit_requests')
      .select('*, tenants(tenant_name)')
      .eq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (start_date) manualQuery = manualQuery.gte('created_at', `${start_date}T00:00:00Z`);
    if (end_date) manualQuery = manualQuery.lte('created_at', `${end_date}T23:59:59Z`);
    if (!search) manualQuery = manualQuery.limit(500);

    const { data: manualData, error: manualErr } = await manualQuery;
    if (manualErr) throw manualErr;

    // 3) Map to unified format
    const mappedMutations = (mutationsData || []).map(mut => ({
      ...mut,
      status: 'Berhasil'
    }));

    const mappedManual = (manualData || []).map(req => ({
      id: `req_${req.id}`,
      amount: req.amount,
      tenant_id: req.tenant_id,
      tenants: req.tenants,
      type: 'in',
      description: 'Top Up Deposit Manual (Ditolak)',
      created_at: req.created_at,
      ref_id: `REQ-${req.id}`,
      status: 'Ditolak'
    }));

    let combined = [...mappedMutations, ...mappedManual];
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 4) Universal search: match against ALL fields like Quasar framework
    if (search) {
      const q = search.toLowerCase().trim();
      combined = combined.filter(item => {
        const tenantName = (item.tenants?.tenant_name || '').toLowerCase();
        const tenantId = (item.tenant_id || '').toLowerCase();
        const refId = (item.ref_id || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const status = (item.status || '').toLowerCase();
        const amount = String(item.amount || '');
        const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '';
        
        return tenantName.includes(q) ||
               tenantId.includes(q) ||
               refId.includes(q) ||
               desc.includes(q) ||
               status.includes(q) ||
               amount.includes(q) ||
               dateStr.toLowerCase().includes(q);
      });
    }

    // 5) Limit results
    combined = combined.slice(0, 500);

    return res.json({ success: true, history: combined });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Create Top Up Invoice
app.post('/api/ppob/topup', async (req, res) => {
  const { tenant_id, outlet_id, amount } = req.body;
  if (!tenant_id || !amount || amount < 10000) return res.status(400).json({ error: 'Minimal top up Rp 10.000' });

  try {
    // Top Up goes to Super Admin Xendit Account!
    const response = await axios.post(
      'https://api.xendit.co/v2/invoices',
      {
        external_id: `TOPUP-${tenant_id}-${outlet_id || 'null'}-${Date.now()}`,
        amount: amount,
        description: `Top Up Saldo PPOB Tenant ${tenant_id}`,
        success_redirect_url: `https://agrapos.dev/dashboard`,
        failure_redirect_url: `https://agrapos.dev/dashboard`
      },
      {
        auth: { username: XENDIT_KEY, password: '' },
      }
    );

    return res.json({ success: true, invoice_url: response.data.invoice_url });
  } catch (err) {
    console.error('Top Up Error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Gagal membuat tagihan top up.' });
  }
});

// Create Manual Deposit Request (In-App Flow)
app.post('/api/ppob/manual-deposit', async (req, res) => {
  const { tenant_id, outlet_id, amount, proof_image } = req.body;
  if (!tenant_id || !amount || amount < 10000 || !proof_image) return res.status(400).json({ error: 'Data tidak lengkap. Pastikan nominal valid dan bukti transfer disertakan.' });

  try {
    const { error } = await supabase.rpc('submit_manual_deposit', {
      p_tenant_id: tenant_id,
      p_outlet_id: outlet_id ? Number(outlet_id) : null,
      p_amount: amount,
      p_proof_image: proof_image
    });
    if (error) throw error;
    return res.json({ success: true, message: 'Bukti transfer berhasil dikirim. Menunggu konfirmasi admin.' });
  } catch (err) {
    console.error('Manual Deposit Error:', err.message);
    return res.status(500).json({ error: 'Gagal mengirim pengajuan deposit.' });
  }
});

// Super Admin: Get Deposit Requests
app.get('/api/saas/deposit-requests', async (req, res) => {
  const { status = 'pending' } = req.query;
  try {
    const { data, error } = await supabase.from('manual_deposit_requests')
      .select('*, tenants(tenant_name)')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, requests: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Super Admin: Action on Deposit Request (Approve/Reject)
app.post('/api/saas/deposit-requests/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action, pin } = req.body; // action = 'approve' | 'reject'
  const SUPERADMIN_PIN = process.env.VITE_SUPERADMIN_PIN || '@Hapratama30';
  
  if (pin !== SUPERADMIN_PIN) return res.status(401).json({ error: 'Unauthorized PIN' });

  try {
    const { data: request, error: fetchErr } = await supabase.from('manual_deposit_requests').select('*').eq('id', id).single();
    if (fetchErr || !request) throw new Error('Pengajuan tidak ditemukan');
    if (request.status !== 'pending') throw new Error('Pengajuan sudah diproses sebelumnya');

    if (action === 'approve') {
      // Add balance via RPC
      const { error: rpcErr } = await supabase.rpc('add_tenant_balance', {
        p_tenant_id: request.tenant_id,
        p_outlet_id: request.outlet_id ? Number(request.outlet_id) : null,
        p_amount: request.amount,
        p_description: 'Top Up Deposit Manual (Approved)',
        p_ref_id: `DEPOSIT-APPROVED-${id}-${Date.now()}`
      });
      if (rpcErr) throw rpcErr;
      
      await supabase.from('manual_deposit_requests').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id);
    } else if (action === 'reject') {
      await supabase.from('manual_deposit_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.json({ success: true, message: `Berhasil di-${action === 'approve' ? 'Terima' : 'Tolak'}` });
  } catch (err) {
    console.error('Deposit Action Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Super Admin: Get Withdrawal Requests
app.get('/api/saas/withdrawal-requests', async (req, res) => {
  const { status = 'pending' } = req.query;
  try {
    const { data, error } = await supabase.from('tenant_withdrawals')
      .select('*, tenants(tenant_name)')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, requests: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Super Admin: Action on Withdrawal Request (Approve/Reject)
app.post('/api/saas/withdrawal-requests/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action, pin } = req.body; // action = 'approve' | 'reject'
  const SUPERADMIN_PIN = process.env.VITE_SUPERADMIN_PIN || '@Hapratama30';
  
  if (pin !== SUPERADMIN_PIN) return res.status(401).json({ error: 'Unauthorized PIN' });

  try {
    const { data: request, error: fetchErr } = await supabase.from('tenant_withdrawals').select('*').eq('id', id).single();
    if (fetchErr || !request) throw new Error('Pengajuan tidak ditemukan');
    if (request.status !== 'pending') throw new Error('Pengajuan sudah diproses sebelumnya');

    if (action === 'approve') {
      // Deduct balance via RPC
      const { data: success, error: rpcErr } = await supabase.rpc('deduct_tenant_balance', {
        p_tenant_id: request.tenant_id,
        p_outlet_id: null,
        p_amount: request.amount,
        p_description: `Penarikan Tunai AgraPay (Approved)`,
        p_ref_id: `WITHDRAWAL-APPROVED-${id}-${Date.now()}`
      });
      if (rpcErr) throw rpcErr;
      if (!success) throw new Error('Saldo tenant tidak mencukupi untuk penarikan ini.');
      
      await supabase.from('tenant_withdrawals').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id);
    } else if (action === 'reject') {
      await supabase.from('tenant_withdrawals').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.json({ success: true, message: `Berhasil di-${action === 'approve' ? 'Setujui' : 'Tolak'}` });
  } catch (err) {
    console.error('Withdrawal Action Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Super Admin: Get All Withdrawal History (With Filters)
app.get('/api/saas/withdrawal-history', async (req, res) => {
  const { start_date, end_date, search } = req.query;

  try {
    let query = supabase.from('tenant_withdrawals')
      .select('*, tenants(tenant_name)')
      .neq('status', 'pending')
      .order('created_at', { ascending: false });

    if (start_date) query = query.gte('created_at', `${start_date}T00:00:00Z`);
    if (end_date) query = query.lte('created_at', `${end_date}T23:59:59Z`);
    if (!search) query = query.limit(500);

    const { data, error } = await query;
    if (error) throw error;

    let combined = data || [];

    // Universal search
    if (search) {
      const q = search.toLowerCase().trim();
      combined = combined.filter(item => {
        const tenantName = (item.tenants?.tenant_name || '').toLowerCase();
        const tenantId = (item.tenant_id || '').toLowerCase();
        const bankName = (item.bank_name || '').toLowerCase();
        const accNumber = (item.account_number || '').toLowerCase();
        const accName = (item.account_name || '').toLowerCase();
        const status = (item.status || '').toLowerCase();
        const amount = String(item.amount || '');
        const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '';
        
        return tenantName.includes(q) ||
               tenantId.includes(q) ||
               bankName.includes(q) ||
               accNumber.includes(q) ||
               accName.includes(q) ||
               status.includes(q) ||
               amount.includes(q) ||
               dateStr.toLowerCase().includes(q);
      });
    }

    combined = combined.slice(0, 500);

    return res.json({ success: true, history: combined });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Pay PPOB with Internal Balance
app.post('/api/ppob/pay-with-balance', async (req, res) => {
  const { tenant_id, outlet_id, sku_code, customer_number, product_name, price, margin } = req.body;
  if (!tenant_id || !sku_code || !customer_number || !price) return res.status(400).json({ error: 'Data tidak lengkap' });

  try {
    const ref_id = `ppob-${tenant_id}-${Date.now()}`;
    const totalDeduction = Number(price) + Number(margin);

    // 1. Potong Saldo via RPC (Aman dari race condition)
    const { data: success, error: deductErr } = await supabase.rpc('deduct_tenant_balance', {
      p_tenant_id: tenant_id,
      p_outlet_id: outlet_id ? Number(outlet_id) : null,
      p_amount: totalDeduction,
      p_description: `Beli ${product_name} (${customer_number})`,
      p_ref_id: ref_id
    });

    if (deductErr) throw new Error(deductErr.message);
    if (!success) return res.status(400).json({ error: 'Saldo PPOB tidak mencukupi!' });

    // 2. Catat ke ppob_transactions (Pending)
    const { data: ppobTx, error: txErr } = await supabase.from('ppob_transactions').insert({
      tenant_id, 
      outlet_id: outlet_id ? Number(outlet_id) : null,
      customer_number, 
      sku_code, 
      product_name, 
      base_price: price, 
      selling_price: totalDeduction, 
      ref_id, 
      status: 'Pending'
    }).select().single();

    // 3. Tembak Digiflazz
    const { data: settings } = await supabase.from('ppob_settings').select('*').is('tenant_id', null).maybeSingle();
    const sign = generateSign(settings.api_username, settings.api_key, ref_id);
    
    // Asynchronous call ke Digiflazz
    axios.post(`${DIGIFLAZZ_URL}/transaction`, {
      username: settings.api_username,
      buyer_sku_code: sku_code,
      customer_no: customer_number,
      ref_id, sign
    }).then(async (dfRes) => {
      const dfStatus = dfRes.data?.data?.status; // Pending, Sukses, Gagal
      if (dfStatus === 'Gagal') {
        // Refund otomatis jika gagal di awal
        await supabase.rpc('add_tenant_balance', {
          p_tenant_id: tenant_id, 
          p_outlet_id: outlet_id ? Number(outlet_id) : null,
          p_amount: totalDeduction,
          p_description: `Refund Gagal ${product_name}`, 
          p_ref_id: ref_id + '-refund'
        });
        await supabase.from('ppob_transactions').update({ status: 'Failed' }).eq('ref_id', ref_id);
      } else if (dfStatus === 'Sukses') {
        await supabase.from('ppob_transactions').update({ status: 'Success', sn: dfRes.data.data.sn }).eq('ref_id', ref_id);
      }
    }).catch(async (e) => {
      console.error('Digiflazz hit error:', e.message);
    });

    return res.json({ success: true, message: 'Transaksi diproses menggunakan Saldo.', transaction: ppobTx });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Gagal proses saldo' });
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`Backend AGRAPos jalan di port ${PORT}`));
}

export default app;
