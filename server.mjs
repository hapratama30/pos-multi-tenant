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
    const activationUrl = xenditData.public_profile?.activation_url;

    const { error: supabaseError } = await supabase
      .from('payment_settings')
      .upsert(
        {
          tenant_id: tenantId,
          outlet_id: outletId,
          xendit_merchant_id: xenditAccountId,
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
        const status = existingAccount.status === 'LIVE' ? 'Aktif' : 'Diproses';

        const { error: supabaseError } = await supabase
          .from('payment_settings')
          .upsert(
            {
              tenant_id: tenantId,
              outlet_id: outletId,
              xendit_merchant_id: xenditAccountId,
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

app.post('/api/xendit/webhook-account-update', async (req, res) => {
  const webhookData = req.body;

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
        .eq('xendit_merchant_id', xenditAccountId);

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
    let query = supabase.from('payment_settings').select('xendit_merchant_id').eq('tenant_id', tenantId);
    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }
    const { data: settings, error: dbError } = await query.maybeSingle();

    if (dbError) throw dbError;
    
    const xenditMerchantId = settings?.xendit_merchant_id;
    
    if (!xenditMerchantId || xenditMerchantId === 'ID-AGRAPOS-BYPASS') {
      return res.status(200).json({
        success: true,
        isSimulated: true,
        qrString: `https://agrapos.dev/qris-simulate?amount=${amount}&merchant=ID-AGRAPOS-BYPASS&tx=${transactionId}`,
      });
    }

    const response = await axios.post(
      'https://api.xendit.co/qr_codes',
      {
        reference_id: String(transactionId),
        type: 'DYNAMIC',
        currency: 'IDR',
        amount: Number(amount)
      },
      {
        headers: {
          ...xenditAuthHeader,
          'api-version': '2022-07-31',
          'for-user-id': xenditMerchantId
        }
      }
    );

    return res.status(200).json({
      success: true,
      qrString: response.data.qr_string,
      qrCodeId: response.data.id,
      status: response.data.status,
    });
  } catch (error) {
    console.error('Error Create QR Xendit:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.message || error.message || 'Gagal generate QRIS dari Xendit.',
    });
  }
});

app.post('/api/xendit/create-va', async (req, res) => {
  const { tenantId, outletId, bankCode, name, amount, transactionId } = req.body;

  if (!tenantId || !bankCode || !name || !amount || !transactionId) {
    return res.status(400).json({ error: 'Data input tidak lengkap!' });
  }

  try {
    let query = supabase.from('payment_settings').select('xendit_merchant_id').eq('tenant_id', tenantId);
    if (outletId) {
      query = query.eq('outlet_id', outletId);
    }
    const { data: settings, error: dbError } = await query.maybeSingle();

    if (dbError) throw dbError;

    const xenditMerchantId = settings?.xendit_merchant_id;

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

    const response = await axios.post(
      'https://api.xendit.co/callback_virtual_accounts',
      {
        external_id: String(transactionId),
        bank_code: bankCode.toUpperCase(),
        name: name,
        expected_amount: Number(amount),
        is_closed: true
      },
      {
        headers: {
          ...xenditAuthHeader,
          'for-user-id': xenditMerchantId
        }
      }
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
    console.error('Error Create VA Xendit:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.message || error.message || 'Gagal generate VA dari Xendit.',
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
  let transactionId = payload.external_id || payload.reference_id;
  let amount = payload.amount;
  let bankCode = payload.bank_code;
  const isQrEvent = payload.event === 'qr.payment' || (payload.data && payload.data.qr_code);

  if (isQrEvent && payload.data) {
    transactionId = payload.data.qr_code?.reference_id || transactionId;
    amount = payload.data.qr_payment?.amount || payload.data.qr_code?.amount || amount;
  }

  if (!transactionId) {
    return res.status(400).send('Invalid webhook payload: Missing external_id or reference_id');
  }

  try {
    // 3. Ambil data transaksi dari Supabase
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
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
    const { data: settings, error: dbError } = await supabase
      .from('payment_settings')
      .select('xendit_merchant_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (dbError) throw dbError;

    const xenditMerchantId = settings?.xendit_merchant_id;

    if (!xenditMerchantId || xenditMerchantId === 'ID-AGRAPOS-BYPASS') {
      return res.status(200).json({
        success: true,
        qrString: `https://agrapos.dev/merchant/ID-AGRAPOS-BYPASS`,
      });
    }

    const referenceId = `static-qr-${tenantId}`;
    try {
      const response = await axios.post(
        'https://api.xendit.co/qr_codes',
        {
          reference_id: referenceId,
          type: 'STATIC',
          currency: 'IDR'
        },
        {
          headers: {
            ...xenditAuthHeader,
            'api-version': '2022-07-31',
            'for-user-id': xenditMerchantId
          }
        }
      );

      return res.status(200).json({
        success: true,
        qrString: response.data.qr_string,
      });
    } catch (error) {
      const xenditError = error.response?.data;
      if (xenditError?.error_code === 'DUPLICATE_ERROR' && xenditError.existing) {
        const getResponse = await axios.get(
          `https://api.xendit.co/qr_codes/${xenditError.existing}`,
          {
            headers: {
              ...xenditAuthHeader,
              'api-version': '2022-07-31',
              'for-user-id': xenditMerchantId
            }
          }
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
    const { data: settings, error: dbError } = await supabase
      .from('payment_settings')
      .select('xendit_merchant_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (dbError) throw dbError;
    const xenditMerchantId = settings?.xendit_merchant_id;

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
          
          const createResponse = await axios.post(
            'https://api.xendit.co/callback_virtual_accounts',
            {
              external_id: `fixed-va-${tenantId}-${bank.toLowerCase()}`,
              bank_code: bank,
              name: vaName,
              is_closed: false
            },
            {
              headers: {
                ...xenditAuthHeader,
                'for-user-id': xenditMerchantId
              }
            }
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
app.listen(PORT, () => console.log(`Backend AGRAPos jalan di port ${PORT}`));

setInterval(() => {}, 1000);
